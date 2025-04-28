import { useAuth } from "@/hooks/use-auth";
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Ward } from "@shared/schema";

interface WardSelectorProps {
  onWardChange?: (ward: Ward | null) => void;
  className?: string;
}

export function WardSelector({ onWardChange, className }: WardSelectorProps) {
  const { userWards, selectedWard, setSelectedWard } = useAuth();

  const handleWardChange = (wardId: string) => {
    const newSelectedWard = userWards?.find(ward => ward.id.toString() === wardId) || null;
    setSelectedWard(newSelectedWard);
    if (onWardChange) {
      onWardChange(newSelectedWard);
    }
  };

  if (!userWards || userWards.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <Select
        value={selectedWard?.id.toString() || ""}
        onValueChange={handleWardChange}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select ward" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Your Wards</SelectLabel>
            {userWards.map((ward) => (
              <SelectItem key={ward.id} value={ward.id.toString()}>
                {ward.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}