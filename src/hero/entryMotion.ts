export type PaperPortal = {
  left: number; top: number; width: number; height: number; rotation: number;
  reduced?: boolean;
};

export type HeroCameraHandle = {
  approachPaper: () => Promise<PaperPortal | null>;
  resetCamera: () => void;
};
