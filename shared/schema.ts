// Static data app — no database needed
// Data types for Grant's memoir movements

export interface Movement {
  location: string;
  date: string | null;
  description: string;
  lat?: number | null;
  lng?: number | null;
}

export interface Chapter {
  chapter: number;
  roman: string;
  title: string;
  volume: number;
  movements: Movement[];
}
