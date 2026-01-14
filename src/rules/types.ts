export type AviotecInputs = {
  mode: '2d' | '3d-param' | '3d-obj';
  seed: number;
};

export type AviotecOutputs = {
  status: 'ok';
  summary: string;
  generatedAt: string;
  echo: AviotecInputs;
};
