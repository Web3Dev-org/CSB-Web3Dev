
export type RolUtilizator = 'USER' | 'ADMIN';

export type StatusUtilizator =
  | 'STUDENT'
  | 'CADRU_DIDACTIC'
  | 'EXTERN';

export type StatusRezervare =
  | 'IN_ASTEPTARE'
  | 'CONFIRMATA'
  | 'RESPINSA'
  | 'ANULATA'
  | 'FINALIZATA';

export type TipRezervare = 'PE_ORA' | 'PE_JOC';

export interface Utilizator {
  id: number;
  email: string;
  rol: RolUtilizator;
  codStatus?: StatusUtilizator;
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
