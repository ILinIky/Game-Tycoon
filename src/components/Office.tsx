import StudioWorld from "./game/StudioWorld";
export default function Office(_props: { staff?: number; level?: number }) {
  return (
    <div className="office-preview">
      <StudioWorld
        onSelect={() => {}}
        selected={null}
        animated={false}
        blocked
        titleScreen
      />
    </div>
  );
}
