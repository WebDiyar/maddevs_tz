import { BookOpenIcon, CodeIcon, GlobeIcon, MessagesSquareIcon, SendIcon } from 'lucide-react';

const REPO_URL = 'https://github.com/WebDiyar/maddevs_tz';
const DEMO_URL = 'https://maddevs-tz.vercel.app';
const TELEGRAM_URL = 'https://t.me/a_diyar_tr';

export const PROJECT_LINKS = [
  { key: 'github', href: REPO_URL, icon: CodeIcon },
  { key: 'demo', href: DEMO_URL, icon: GlobeIcon },
  { key: 'readme', href: `${REPO_URL}#readme`, icon: BookOpenIcon },
  { key: 'chat', href: `${REPO_URL}/blob/main/docs/ai-chat.md`, icon: MessagesSquareIcon },
  { key: 'telegram', href: TELEGRAM_URL, icon: SendIcon },
] as const;
