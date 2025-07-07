import { QRCode } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";

interface QrCodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  wardName: string;
  accessCode: string;
}

export function QrCodeDialog({ isOpen, onClose, wardName, accessCode }: QrCodeDialogProps) {
  const url = `${window.location.origin}/ward/${accessCode}`;

  const downloadQRCode = () => {
    const canvas = document.getElementById("qr-code-canvas") as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
      let downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `${wardName.replace(/\s+/g, '_')}_QRCode.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  const printQRCode = () => {
    const canvas = document.getElementById("qr-code-canvas") as HTMLCanvasElement;
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      let windowContent = '<!DOCTYPE html>';
      windowContent += '<html>';
      windowContent += '<head><title>Print QR Code</title></head>';
      windowContent += '<body>';
      windowContent += `<h2 style="text-align:center;">${wardName} Meal Calendar</h2>`;
      windowContent += `<div style="text-align:center;"><img src="${dataUrl}"></div>`;
      windowContent += `<p style="text-align:center;">Scan to access the missionary meal calendar.</p>`;
      windowContent += '</body>';
      windowContent += '</html>';
      const printWin = window.open('', '', 'width=340,height=460');
      printWin?.document.write(windowContent);
      printWin?.document.close();
      printWin?.focus();
      printWin?.print();
      printWin?.close();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>QR Code for {wardName}</DialogTitle>
          <DialogDescription>
            Ward members can scan this code to easily access the meal calendar.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-4">
          <QRCode
            id="qr-code-canvas"
            value={url}
            size={256}
            level={"H"}
            includeMargin={true}
          />
        </div>
        <DialogFooter className="sm:justify-center">
          <Button onClick={downloadQRCode}>
            <Download className="mr-2 h-4 w-4" /> Download
          </Button>
          <Button variant="outline" onClick={printQRCode}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}