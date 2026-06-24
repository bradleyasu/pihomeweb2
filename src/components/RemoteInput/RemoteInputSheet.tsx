/**
 * Remote text entry sheet.
 *
 * When a text field is focused on the PiHome touchscreen, the status payload
 * (polled ~1s over the main socket) reports it via `status.text_input`. This
 * component then opens a *dedicated* websocket (port 8766) and shows a sheet so
 * the user can type on their phone — gaining paste, voice dictation and
 * autocomplete. Each change is mirrored live onto the device field.
 *
 * The dedicated socket is opened only while a field is focused and closed when
 * the field blurs or the user dismisses the sheet.
 *
 * Design notes:
 * - Visibility (`show`) and field metadata are *derived during render* from the
 *   status — no state/effect needed to track them.
 * - The editable `value` is seeded with the "adjust state during render" pattern
 *   (compare focus_id to its previous value) rather than from an effect.
 * - The only effect here syncs the external system (the dedicated WebSocket):
 *   it opens on show, and its cleanup closes on hide / focus change / unmount.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Modal, Stack, TextInput, Textarea, PasswordInput, Button, Text } from '@mantine/core';
import { IconDeviceMobileMessage } from '@tabler/icons-react';
import { usePiHome } from '../../providers/PiHomeProvider.tsx';
import { getTextWsUrl } from '../../constants.ts';

const DEBOUNCE_MS = 75;

export function RemoteInputSheet() {
  const { status } = usePiHome();
  const ti = status?.text_input;
  const active = !!ti?.active;
  const focusId = ti?.focus_id ?? 0;
  const secure = !!ti?.secure;

  const [value, setValue] = useState('');
  const [prevFocusId, setPrevFocusId] = useState<number | null>(null);
  const [dismissedFocusId, setDismissedFocusId] = useState<number | null>(null);

  // Whether the sheet should be visible right now (derived, not stored).
  const show = active && focusId !== dismissedFocusId;

  // Seed the editable value when a brand-new focused field appears. Setting state
  // during render (guarded by a changed focus_id) is the documented React pattern
  // for adjusting state from props — it avoids an effect + cascading renders.
  if (show && focusId !== prevFocusId) {
    setPrevFocusId(focusId);
    setValue(secure ? '' : (ti?.value ?? ''));
  }

  const wsRef = useRef<WebSocket | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Open the dedicated socket while shown; cleanup closes it on hide / focus
  // change / unmount. The effect body only touches the external system.
  useEffect(() => {
    if (!show) return;
    const ws = new WebSocket(getTextWsUrl());
    wsRef.current = ws;
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      ws.close();
      wsRef.current = null;
    };
  }, [show, focusId]);

  const handleChange = useCallback((v: string) => {
    setValue(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ focus_id: focusId, value: v }));
      }
    }, DEBOUNCE_MS);
  }, [focusId]);

  const handleDone = useCallback(() => {
    setDismissedFocusId(focusId);
  }, [focusId]);

  if (!show) return null;

  const inputProps = {
    label: ti?.hint || 'Enter text',
    value,
    'data-autofocus': true,
    autoFocus: true,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      handleChange(e.currentTarget.value),
  };

  return (
    <Modal
      opened
      onClose={handleDone}
      centered
      title={
        <Text fw={600} size="sm">
          <IconDeviceMobileMessage size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Type on {ti?.screen || 'PiHome'}
        </Text>
      }
    >
      <Stack gap="md">
        {ti?.multiline ? (
          <Textarea {...inputProps} autosize minRows={3} maxRows={8} />
        ) : secure ? (
          <PasswordInput {...inputProps} />
        ) : (
          <TextInput {...inputProps} />
        )}
        <Button fullWidth onClick={handleDone}>
          Done
        </Button>
      </Stack>
    </Modal>
  );
}
