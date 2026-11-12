import type { Group } from '../core/continent-tournament';

// Countries that span two continents are assigned as listed below: Russia and Cyprus count as
// Europe, Turkey, Georgia, Armenia, Azerbaijan and Kazakhstan as Asia, and Egypt as Africa.
const CODES: Record<string, string> = {
  Europe:
    'al ad at by be ba bg hr cy cz dk ee fi fr de gr hu is ie it lv li lt lu mt md mc me nl mk no pl pt ro ru sm rs sk si es se ch ua gb va',
  Asia: 'af am az bh bd bt bn kh cn ge in id ir iq il jp jo kz kp kr kw kg la lb my mv mn mm np om pk ps ph qa sa sg lk sy tj th tl tr tm ae uz vn ye',
  Africa:
    'dz ao bj bw bf bi cv cm cf td km cg cd ci dj eg gq er sz et ga gm gh gn gw ke ls lr ly mg mw ml mr mu ma mz na ne ng rw st sn sc sl so za ss sd tz tg tn ug zm zw',
  'North America': 'ag bs bb bz ca cr cu dm do sv gd gt ht hn jm mx ni pa kn lc vc tt us',
  'South America': 'ar bo br cl co ec gy py pe sr uy ve',
  Oceania: 'au fj ki mh fm nr nz pw pg ws sb to tv vu',
};

/** The qualifying rounds in the order they are played. */
export const CONTINENTS: Group[] = Object.entries(CODES).map(([name, codes]) => ({
  name,
  members: codes.split(' '),
}));
