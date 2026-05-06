const Header = () => {
  return (
    <header className="flex items-center justify-between py-5 mb-8 border-b border-white/[0.08]">
      <div className="flex items-center gap-3">
        <div className="w-[3px] h-6 bg-[#E10600]" />
        <h1
          className="text-sm font-bold tracking-[0.28em] text-white uppercase"
          style={{ fontFamily: "'Formula1 Display'" }}
        >
          Telemetrics
        </h1>
      </div>
      <span className="text-[#888892] text-[10px] tracking-[0.2em] uppercase font-medium hidden sm:block">
        F1 Data Dashboard
      </span>
    </header>
  );
};

export default Header;
