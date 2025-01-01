import Logo from "public/cpg-logo.svg";

export default function Header() {
  return (
    <header
      className="flex justify-center text-white bg-primary p-8"
    >
      <div
        className="flex gap-4"
      >
        <Logo
          className="block w-24 h-24"
        />
        <div>
          <h1
            className="text-4xl font-bold leading-tight text-center mb-2"
          >
            Creative Photography Group
          </h1>
          <p className="max-w-[420px]">
            Calling all analog and digital photography enthusiasts and professionals who want to socialize, collaborate and expand their knowledge!
            <br />
            <br />
            Join our community for announcements, photo challenges and discussions!
          </p>
          <div className="flex items-center gap-4 mt-6">
            {/* Social links */}
            <a
              href="https://discord.gg/cWQK8udb6p"
              className="flex items-center inline-block text-black bg-white hover:bg-[#a6db93] rounded-full py-1 px-3"
              target="_blank"
            >
              Discord
            </a>

            <a
              href="https://www.instagram.com/creative.photography.group"
              className="flex items-center inline-block text-black bg-white hover:bg-[#a6db93] rounded-full py-1 px-3"
              target="_blank"
            >
              Instagram
            </a>

            <a
              href="https://chat.whatsapp.com/Fg6az5H2NTP9unlhqoxQEf"
              className="flex items-center inline-block text-black bg-white hover:bg-[#a6db93] rounded-full py-1 px-3"
              target="_blank"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </header>
  )
}
