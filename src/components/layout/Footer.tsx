import clsx from "clsx";

// Import social icons
import DiscordSVG from "public/icons/discord2.svg";
import InstagramSVG from "public/icons/instagram.svg";
import WhatsAppSVG from "public/icons/whatsapp.svg";

const socialLinks = [
  {
    name: "Discord",
    url: "https://discord.gg/cWQK8udb6p",
    icon: DiscordSVG,
  },
  {
    name: "Instagram",
    url: "https://www.instagram.com/creativephotography.group",
    icon: InstagramSVG,
  },
  {
    name: "WhatsApp",
    url: "https://chat.whatsapp.com/Fg6az5H2NTP9unlhqoxQEf",
    icon: WhatsAppSVG,
  },
];

export default function Footer() {
  return (
    <footer className="mt-auto flex justify-center border-t-[0.0625rem] border-border-color bg-background-light p-4 py-4 text-foreground">
      <div className="flex w-full max-w-screen-md flex-col items-center gap-3">
        <div className="flex items-center gap-4 max-md:justify-center">
          {socialLinks.map(({ name, url, icon: Icon }) => (
            <a
              key={name}
              href={url}
              className={clsx(
                "flex items-center justify-center rounded-full border-[0.0625rem] border-border-color bg-background fill-foreground p-2 font-[family-name:var(--font-geist-mono)] text-sm font-semibold text-foreground hover:border-primary-alt hover:bg-primary-alt hover:fill-slate-950 hover:text-slate-950 sm:px-3 sm:py-1",
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon className="inline-block sm:mr-2" />
              <span className="hidden sm:inline-block">{name}</span>
            </a>
          ))}
        </div>
        <p className="text-center opacity-70">&copy; {new Date().getFullYear()} Creative Photography Group</p>
      </div>
    </footer>
  );
};
