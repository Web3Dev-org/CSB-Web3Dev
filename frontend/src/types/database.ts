export type RolUtilizator = 'STUDENT' | 'CADRU_DIDACTIC' | 'ADMIN';
export type StatusRezervare = 'PENDING' | 'CONFIRMAT' | 'ANULAT';
export type TipRezervare = 'PE_ORA' | 'PE_JOC';

export interface Utilizator {
  id: number;
  email: string;
  rol: RolUtilizator;
  codStatus?: string;
  minuteReminder?: number;
}

export interface Facilitate {
  id: number;
  nume: string;
  pretPeOra: number;
  multiplicatorJoc: number;
}

export interface Echipament {
  id: number;
  nume: string;
  pret: number;
}

export interface Rezervare {
  id: number;
  idUtilizator: number;
  idFacilitate: number;
  idTermeni?: number;
  tip: TipRezervare;
  status: StatusRezervare;
  sumaTotala: number;
}

export interface SlotRezervare {
  id: number;
  idRezervare: number;
  idFacilitate: number;
  inceputSlot: string;
  esteActiv: boolean;
}