const BLOCK_END = '\r\n\r\n';

export function parseAmiMessage(buffer: string): { events: Record<string, string>[]; remainder: string } {
  const events: Record<string, string>[] = [];
  let remainder = buffer;

  while (remainder.includes(BLOCK_END)) {
    const [block, rest] = remainder.split(BLOCK_END, 2);
    remainder = rest ?? '';

    const event = parseBlock(block);
    if (Object.keys(event).length > 0) {
      events.push(event);
    }
  }

  return { events, remainder };
}

function parseBlock(block: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = block.split('\r\n').filter((line) => line.trim());

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      result[key] = value;
    }
  }

  return result;
}
