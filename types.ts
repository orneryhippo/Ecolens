
export interface IdentifiedItem {
  commonName: string;
  scientificName: string;
  description: string;
  type: 'Plant' | 'Animal';
}

export interface GeneratedVariation {
  description: string;
  imageUrl: string;
}
