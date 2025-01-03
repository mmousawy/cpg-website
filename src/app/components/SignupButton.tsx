import CheckSVG from 'public/icons/check.svg';

export default function SignupButton(props: React.HTMLProps<HTMLDivElement>) {
  return (
    <div
      {...props}
    >
      <button
        className="flex items-center justify-center justify-self-start rounded-full bg-primary fill-white px-3 py-1 font-[family-name:var(--font-geist-mono)] text-sm font-semibold text-white hover:bg-primary-alt hover:fill-background hover:text-background"
      >
        <CheckSVG className="mr-2 inline-block" />
        <span className="text-nowrap">Sign up</span>
      </button>
    </div>
  );
}
