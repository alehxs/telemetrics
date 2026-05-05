const Header = () => {
  return (
    <div className="flex flex-col items-center mb-6">
      <div className="pb-4">
        <h1
          className="text-xl font-bold tracking-wide"
          style={{ fontFamily: "'Formula1 Display'", color: '#E10600' }}
        >
          Telemetrics
        </h1>
      </div>
      <div className="w-full h-px bg-gradient-to-r from-transparent via-[#E10600] to-transparent" />
    </div>
  );
};

export default Header;
