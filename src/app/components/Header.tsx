import clsx from "clsx";
import LogoSVG from "public/cpg-logo.svg";

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
    url: "https://www.instagram.com/creative.photography.group",
    icon: InstagramSVG,
  },
  {
    name: "WhatsApp",
    url: "https://chat.whatsapp.com/Fg6az5H2NTP9unlhqoxQEf",
    icon: WhatsAppSVG,
  },
];

export default function Header() {
  return (
    <header
      className="relative z-10 flex justify-center border-b-[0.0625rem] border-t-8 border-b-border-color border-t-primary bg-background-light p-6 text-foreground shadow-md shadow-[#00000005]  sm:p-12"
    >
      <div
        className="flex w-full max-w-screen-md flex-col items-center gap-4 sm:gap-6 md:flex-row"
      >
        <LogoSVG
          className="block size-24 max-sm:size-20"
        />
        <div className="flex flex-col justify-center gap-5">
          <h1
            className="font-bold leading-tight max-sm:text-center max-sm:text-3xl sm:text-4xl"
          >
            Creative Photography Group
          </h1>
          <div className="flex items-center gap-4 max-md:justify-center">
            {/* Social links */}
            { socialLinks.map(({ name, url, icon: Icon }) => (
              <a
                key={name}
                href={url}
                className={clsx(
                  "flex items-center justify-center rounded-full border-[0.0625rem] border-border-color bg-background fill-foreground p-2 font-[family-name:var(--font-geist-mono)] text-sm font-semibold text-foreground hover:border-primary-alt hover:bg-primary-alt hover:fill-slate-950 hover:text-slate-950 sm:px-3 sm:py-1",
                  ""
                )}
                target="_blank"
              >
                <Icon className="transition- inline-block sm:mr-2" />
                <span className="hidden sm:inline-block">{name}</span>
              </a>
            )) }
          </div>
        </div>
      </div>
    </header>
  )
}
