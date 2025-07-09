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
import { Congregation } from "@shared/schema";

interface CongregationSelectorProps {
  onCongregationChange?: (congregation: Congregation | null) => void;
  className?: string;
}

export function CongregationSelector({ onCongregationChange, className }: CongregationSelectorProps) {
  const { userCongregations, selectedCongregation, setSelectedCongregation } = useAuth();

  const handleCongregationChange = (congregationId: string) => {
    const newSelectedCongregation = userCongregations?.find(congregation => congregation.id.toString() === congregationId) || null;
    setSelectedCongregation(newSelectedCongregation);
    if (onCongregationChange) {
      onCongregationChange(newSelectedCongregation);
    }
  };

  if (!userCongregations || userCongregations.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <Select
        value={selectedCongregation?.id.toString() || ""}
        onValueChange={handleCongregationChange}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select congregation" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Your Congregations</SelectLabel>
            {userCongregations.map((congregation) => (
              <SelectItem key={congregation.id} value={congregation.id.toString()}>
                {congregation.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}