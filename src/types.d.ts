declare module 'relationship.js' {
  type RelationshipOptions = { text: string; target?: string; sex?: number; type?: string; reverse?: boolean; mode?: string; optimal?: boolean };
  type Relationship = ((options: RelationshipOptions | string) => string[]) & {
    setMode: (name: string, data: Record<string, string[]>) => void;
    data: Map<string, string[]>;
    dataCount: number;
  };
  const relationship: Relationship;
  export default relationship;
}

declare module 'relationship.js/mode' {
  const modes: { north: { name: string; data: Record<string, string[]> }; guangdong: { name: string; data: Record<string, string[]> } };
  export default modes;
}
