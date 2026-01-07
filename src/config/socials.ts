import DiscordSVG from 'public/icons/discord.svg';
import InstagramSVG from 'public/icons/instagram.svg';
import WhatsAppSVG from 'public/icons/whatsapp.svg';

export type SocialLink = {
  name: string
  url: string
  icon: typeof DiscordSVG
  color: string
  handle?: string
  description?: string
}

export const socialLinks: SocialLink[] = [
  {
    name: 'Discord',
    url: 'https://discord.gg/cWQK8udb6p',
    icon: DiscordSVG,
    color: '#5865F2',
    handle: 'Join our server',
    description: 'announcements, challenges & discussions',
  },
  {
    name: 'Instagram',
    url: 'https://www.instagram.com/creativephotography.group',
    icon: InstagramSVG,
    color: '#E4405F',
    handle: '@creativephotography.group',
    description: 'photos, updates & networking',
  },
  {
    name: 'WhatsApp',
    url: 'https://chat.whatsapp.com/Fg6az5H2NTP9unlhqoxQEf',
    icon: WhatsAppSVG,
    color: '#25D366',
    handle: 'Join the chat',
    description: 'meetup updates & practical info',
  },
];
