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

interface WardSelectorProps {
  className?: string;
}

export function WardSelector({ className }: WardSelectorProps) {
  const { userWards, selectedWard, setSelectedWard } = useAuth();

  const handleWardChange = (wardId: string) => {
    const newSelectedWard = userWards?.find(ward => ward.id.toString() === wardId) || null;
    setSelectedWard(newSelectedWard);
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
          <SelectValue placeholder="Select a Ward" />
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