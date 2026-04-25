interface Props {
  onClick: () => void;
  isLoading: boolean;
  loadingText?: string;
}

export const GlowButton = ({ onClick, isLoading, loadingText = "Generating" }: Props) => {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`group relative w-full overflow-hidden rounded-2xl py-3.5 px-5 text-sm font-semibold tracking-wide text-white transition-all ${
        isLoading ? "opacity-90 cursor-wait" : "hover:scale-[1.02]"
      }`}
      style={{
        background:
          "linear-gradient(135deg, hsl(252 70% 35%) 0%, hsl(270 70% 45%) 50%, hsl(192 100% 45%) 100%)",
        boxShadow:
          "0 0 30px hsl(270 70% 45% / 0.4), 0 0 60px hsl(192 100% 50% / 0.2), inset 0 1px 0 hsl(0 0% 100% / 0.15)",
      }}
    >
      <span
        aria-hidden
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background:
            "linear-gradient(135deg, hsl(338 100% 59% / 0.5) 0%, hsl(192 100% 50% / 0.5) 100%)",
        }}
      />
      <span className="relative z-10 flex items-center justify-center gap-2">
        {isLoading ? (
          <>
            <span className="h-2 w-2 rounded-full bg-white/90 animate-blink" />
            {loadingText}…
          </>
        ) : (
          <>Generate Track</>
        )}
      </span>
    </button>
  );
};
