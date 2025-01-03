import CheckSVG from 'public/icons/check.svg';

export default function SignupButton(props: React.HTMLProps<HTMLDivElement>) {
  return (
    <div
      {...props}
    >
      <button
        className="flex items-center justify-center justify-self-start rounded-full border-[0.0625rem] border-primary bg-primary fill-white px-3 py-1 font-[family-name:var(--font-geist-mono)] text-sm font-semibold text-white hover:border-primary-alt hover:bg-primary-alt hover:fill-slate-950 hover:text-slate-950"
      >
        <CheckSVG className="mr-2 inline-block" />
        <span className="text-nowrap">Sign up</span>
      </button>
    </div>
  );
}
