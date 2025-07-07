import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, Download, Printer } from "lucide-react";

interface QRCodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  qrCodeUrl: string;
  wardName: string;
}

export function QRCodeDialog({ isOpen, onClose, qrCodeUrl, wardName }: QRCodeDialogProps) {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code for ${wardName}</title>
            <style>
              @media print {
                body { -webkit-print-color-adjust: exact; }
                .no-print { display: none; }
              }
              body { font-family: sans-serif; text-align: center; }
              img { max-width: 100%; }
            </style>
          </head>
          <body>
            <h2>${wardName} - Meal Calendar</h2>
            <img src="${qrCodeUrl}" alt="QR Code" />
            <p>Scan to access the meal calendar.</p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <QrCode className="mr-2 h-5 w-5" />
            Ward Calendar QR Code
          </DialogTitle>
          <DialogDescription>
            Members can scan this code to access the meal calendar for {wardName}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center p-4">
          <img src={qrCodeUrl} alt="Ward QR Code" className="w-64 h-64 border-4 border-gray-200 rounded-lg" />
        </div>
        <DialogFooter className="sm:justify-center">
          <Button variant="outline" onClick={() => {
            const link = document.createElement('a');
            link.href = qrCodeUrl;
            link.download = `${wardName.replace(/\s+/g, '_')}_QR_Code.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}