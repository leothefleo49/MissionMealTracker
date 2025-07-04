import React, { useRef, useState } from 'react';
import QRCode from 'qrcode.react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QRCodeDisplayProps {
  isOpen: boolean;
  onClose: () => void;
  value: string; // The URL or text to encode in the QR code
  title: string;
  description: string;
}

export function QRCodeDisplay({ isOpen, onClose, value, title, description }: QRCodeDisplayProps) {
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  // Function to download the QR code as a PNG image
  const handleDownload = () => {
    if (qrCodeRef.current) {
      setDownloading(true);
      const canvas = qrCodeRef.current.querySelector('canvas');
      if (canvas) {
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = url;
        link.download = `${title.replace(/\s/g, '-')}-qr-code.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({
          title: "QR Code Downloaded",
          description: "The QR code has been downloaded as a PNG image.",
        });
      } else {
        toast({
          title: "Download Failed",
          description: "Could not find QR code canvas to download.",
          variant: "destructive",
        });
      }
      setDownloading(false);
    }
  };

  // Function to print the QR code
  const handlePrint = () => {
    if (qrCodeRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>${title} QR Code</title>
              <style>
                body { font-family: sans-serif; text-align: center; padding: 20px; }
                img { max-width: 100%; height: auto; margin-bottom: 20px; }
                @media print {
                  body { margin: 0; }
                  img { page-break-after: always; }
                }
              </style>
            </head>
            <body>
              <h1>${title}</h1>
              <p>${description}</p>
              <img src="${(qrCodeRef.current.querySelector('canvas') as HTMLCanvasElement)?.toDataURL('image/png')}" alt="${title} QR Code" />
              <p>Scan this QR code to access the ${title}.</p>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
        toast({
          title: "QR Code Printing",
          description: "Your browser's print dialog should appear shortly.",
        });
      } else {
        toast({
          title: "Print Failed",
          description: "Could not open print window.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-6 rounded-lg shadow-lg">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-bold text-gray-900">{title}</DialogTitle>
          <DialogDescription className="text-gray-600">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center p-4">
          <div ref={qrCodeRef} className="bg-white p-2 rounded-md shadow-inner">
            <QRCode value={value} size={256} level="H" renderAs="canvas" />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <Button onClick={handleDownload} className="flex-1" disabled={downloading}>
            <Download className="mr-2 h-4 w-4" />
            {downloading ? "Downloading..." : "Download QR Code"}
          </Button>
          <Button onClick={handlePrint} variant="outline" className="flex-1">
            <Printer className="mr-2 h-4 w-4" />
            Print QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
