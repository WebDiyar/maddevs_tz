import { DEFAULT_LOCALE } from '@/shared/config';
import { LOCALE_STORAGE_KEY } from '@/shared/model';

export const LOCALE_PENDING_ATTR = 'data-locale-pending';

export const localeScript = `try{var l=JSON.parse(localStorage.getItem('${LOCALE_STORAGE_KEY}')).state.locale;if(l&&l!=='${DEFAULT_LOCALE}')document.documentElement.setAttribute('${LOCALE_PENDING_ATTR}','')}catch(e){}`;
