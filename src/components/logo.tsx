import { NexusIcon } from "./nexus-icon";

export function Logo() {
  return (
    <div className="flex items-center" aria-label="NEXUS Logo">
      <div className="p-1.5 bg-primary rounded-lg">
        <NexusIcon className="h-6 w-6 text-primary-foreground" />
      </div>
    </div>
  );
}
