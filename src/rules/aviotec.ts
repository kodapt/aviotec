import type { AviotecInputs, AviotecOutputs } from './types';

export const calculateAviotec = (inputs: AviotecInputs): AviotecOutputs => {
  return {
    status: 'ok',
    summary: `Placeholder run for ${inputs.mode}`,
    generatedAt: new Date().toISOString(),
    echo: inputs,
  };
};
