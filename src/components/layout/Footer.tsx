import Button from "@/components/shared/Button";
import { socialLinks } from "@/config/socials";

// Import social icons - footer uses discord2 variant
import DiscordSVG from "public/icons/discord2.svg";
import InstagramSVG from "public/icons/instagram.svg";
import WhatsAppSVG from "public/icons/whatsapp.svg";

// Map icons for footer (uses discord2 variant)
const iconMap: Record<string, typeof DiscordSVG> = {
  Discord: DiscordSVG,
  Instagram: InstagramSVG,
  WhatsApp: WhatsAppSVG,
};

export default function Footer() {
  return (
    <footer className="mt-auto flex justify-center border-t-[0.0625rem] border-border-color bg-background-light p-4 py-4 text-foreground">
      <div className="flex w-full max-w-screen-md flex-col items-center gap-3">
        <div className="flex items-center gap-4 max-md:justify-center">
          {socialLinks.map(({ name, url }) => {
            const Icon = iconMap[name];
            return (
              <Button
                key={name}
                href={url}
                variant="secondary"
                icon={<Icon className="inline-block" />}
                className="!p-2 sm:!px-3 sm:!py-1"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="hidden sm:inline-block">{name}</span>
              </Button>
            );
          })}
        </div>
        <p className="text-center opacity-70">&copy; {new Date().getFullYear()} Creative Photography Group</p>
      </div>
    </footer>
  );
};
