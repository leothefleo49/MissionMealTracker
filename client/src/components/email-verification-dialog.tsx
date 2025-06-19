import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, RefreshCw } from "lucide-react";

const verificationSchema = z.object({
  code: z.string().length(4, "Verification code must be 4 digits"),
});

interface EmailVerificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  missionaryId: number;
  email: string;
  onVerified: () => void;
}

export function EmailVerificationDialog({ 
  isOpen, 
  onClose, 
  missionaryId, 
  email,
  onVerified 
}: EmailVerificationDialogProps) {
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);

  const form = useForm<z.infer<typeof verificationSchema>>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      code: "",
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (data: z.infer<typeof verificationSchema>) => {
      const res = await apiRequest("POST", `/api/admin/missionaries/${missionaryId}/verify-email`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Email verified successfully",
        description: "You can now receive notifications at this email address.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/missionaries"] });
      onVerified();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/missionaries/${missionaryId}/send-verification`, {});
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Verification code sent",
        description: "A new verification code has been sent to your email.",
      });
      setIsResending(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send verification code",
        description: error.message,
        variant: "destructive",
      });
      setIsResending(false);
    },
  });

  function onSubmit(data: z.infer<typeof verificationSchema>) {
    verifyMutation.mutate(data);
  }

  function handleResend() {
    setIsResending(true);
    resendMutation.mutate();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            Verify Email Address
          </DialogTitle>
          <DialogDescription>
            Enter the 4-digit verification code sent to <strong>{email}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verification Code</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="0000" 
                      maxLength={4}
                      className="text-center text-2xl tracking-widest font-mono"
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex flex-col space-y-2">
              <Button 
                type="submit" 
                disabled={verifyMutation.isPending}
                className="w-full"
              >
                {verifyMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Email"
                )}
              </Button>
              
              <Button 
                type="button" 
                variant="outline"
                onClick={handleResend}
                disabled={isResending || resendMutation.isPending}
                className="w-full"
              >
                {isResending || resendMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Resend Code"
                )}
              </Button>
            </div>
          </form>
        </Form>
        
        <div className="text-sm text-muted-foreground">
          <p>The verification code will expire in 10 minutes.</p>
          <p>Check your spam folder if you don't see the email.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}