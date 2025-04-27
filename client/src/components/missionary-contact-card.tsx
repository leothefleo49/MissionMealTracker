import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneCall, Copy, MessageSquare, User } from "lucide-react";
import { formatPhoneNumber } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type MissionaryContactCardProps = {
  name: string;
  type: "elders" | "sisters";
  phoneNumber: string;
  messengerAccount?: string;
};

export function MissionaryContactCard({
  name,
  type,
  phoneNumber,
  messengerAccount,
}: MissionaryContactCardProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
  const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
  
  // Style based on missionary type
  const colors = {
    elders: {
      bg: "bg-primary bg-opacity-10",
      text: "text-primary",
      btnClass: "bg-primary hover:bg-blue-700",
    },
    sisters: {
      bg: "bg-amber-500 bg-opacity-10",
      text: "text-amber-500",
      btnClass: "bg-amber-500 hover:bg-amber-600",
    },
  };
  
  const copyPhoneNumber = () => {
    navigator.clipboard.writeText(phoneNumber)
      .then(() => {
        setCopied(true);
        toast({
          title: "Phone number copied!",
          description: `${formattedPhoneNumber} copied to clipboard`,
        });
        
        // Reset copied state after a delay
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
        toast({
          title: "Copy failed",
          description: "Could not copy phone number",
          variant: "destructive",
        });
      });
  };
  
  const makePhoneCall = () => {
    window.location.href = `tel:${phoneNumber}`;
  };
  
  // Function to open Facebook Messenger if messengerAccount is provided
  const openMessenger = () => {
    if (!messengerAccount) return;
    window.open(`https://m.me/${messengerAccount}`, '_blank');
  };
  
  return (
    <Card className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
      <CardContent className="px-4 py-5 sm:p-6">
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${colors[type].bg} rounded-md p-3`}>
            <User className={`h-6 w-6 ${colors[type].text}`} />
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-medium text-gray-900">{type === "elders" ? "Elders" : "Sisters"}</h3>
            <p className="text-sm text-gray-500">{name}</p>
          </div>
        </div>
        
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone Number</label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <div className="relative flex items-stretch flex-grow focus-within:z-10">
                <Input 
                  value={formattedPhoneNumber} 
                  className="focus:ring-primary focus:border-primary block w-full rounded-md sm:text-sm border-gray-300 bg-gray-50" 
                  readOnly 
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                className="relative inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none"
                onClick={copyPhoneNumber}
              >
                <Copy className="h-5 w-5 text-gray-400" />
                <span>{copied ? "Copied!" : "Copy"}</span>
              </Button>
            </div>
          </div>
          
          {messengerAccount && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Message on Facebook</label>
              <div className="mt-1">
                <Button
                  variant="outline"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                  onClick={openMessenger}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Send a Message
                </Button>
              </div>
            </div>
          )}
          
          <div>
            <Button
              type="button"
              className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${colors[type].btnClass} focus:outline-none`}
              onClick={makePhoneCall}
            >
              <PhoneCall className="h-5 w-5 mr-2" />
              Call Missionaries
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
