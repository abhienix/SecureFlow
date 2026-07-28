export const copilotApi = {
  streamChat: (
    messages: any[],
    context: any,
    onToken: (token: string) => void,
    onDone: () => void,
    onError: (err: any) => void
  ) => {
    const BACKEND_URL =
      process.env.REACT_APP_API_URL ||
      'http://localhost:8000';

    fetch(`${BACKEND_URL}/api/v1/copilot/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('sf_token') || sessionStorage.getItem('sf_token') || ''}`,
      },
      body: JSON.stringify({ messages, context }),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Chat API error: ${response.statusText}`);
        }
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) {
          throw new Error('Readable stream not supported');
        }

        let buffer = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine.startsWith('data: ')) continue;
            const dataStr = cleanLine.substring(6).trim();

            if (dataStr === '[DONE]') {
              onDone();
              return;
            }

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.token) {
                onToken(parsed.token);
              }
            } catch (e) {
              // ignore parse errors
            }
          }
        }
        onDone();
      })
      .catch((err) => {
        onError(err);
      });
  },
};
