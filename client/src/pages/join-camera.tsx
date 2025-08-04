import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { Video, QrCode, Camera, Smartphone, Link as LinkIcon, Radio } from "lucide-react";
import { Link } from "wouter";
import QRScanner from "@/components/ui/qr-scanner";

const joinCameraFormSchema = z.object({
  eventCode: z.string().min(1, "Event code is required"),
});

const cameraConfigSchema = z.object({
  label: z.string().min(1, "Camera label is required"),
  operatorName: z.string().optional(),
  quality: z.string().default("720p"),
});

type JoinCameraForm = z.infer<typeof joinCameraFormSchema>;
type CameraConfigForm = z.infer<typeof cameraConfigSchema>;

interface CameraDetails {
  cameraId: string;
  streamKey: string;
  ingestUrl: string;
  label: string;
}

export default function JoinCamera() {
  const { toast } = useToast();
  const [eventId, setEventId] = useState<string | null>(null);
  const [cameraDetails, setCameraDetails] = useState<CameraDetails | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isLive, setIsLive] = useState(false);

  const joinForm = useForm<JoinCameraForm>({
    resolver: zodResolver(joinCameraFormSchema),
    defaultValues: {
      eventCode: "",
    },
  });

  const cameraForm = useForm<CameraConfigForm>({
    resolver: zodResolver(cameraConfigSchema),
    defaultValues: {
      label: "Main Camera",
      operatorName: "",
      quality: "720p",
    },
  });

  const findEventMutation = useMutation({
    mutationFn: async (eventCode: string) => {
      const response = await apiRequest("GET", `/api/events/code/${eventCode}`);
      return response.json();
    },
    onSuccess: (event) => {
      setEventId(event.id);
      toast({
        title: "Event found!",
        description: `Ready to join ${event.name}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Event not found",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const joinCameraMutation = useMutation({
    mutationFn: async (data: CameraConfigForm) => {
      if (!eventId) throw new Error("No event selected");
      const response = await apiRequest("POST", `/api/events/${eventId}/cameras`, data);
      return response.json();
    },
    onSuccess: (camera) => {
      setCameraDetails(camera);
      toast({
        title: "Camera registered!",
        description: "You can now start streaming",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to register camera",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCameraStatusMutation = useMutation({
    mutationFn: async (isLive: boolean) => {
      if (!cameraDetails) throw new Error("No camera registered");
      const response = await apiRequest("PATCH", `/api/cameras/${cameraDetails.cameraId}/status`, {
        isLive,
      });
      return response.json();
    },
    onSuccess: () => {
      setIsLive(!isLive);
      toast({
        title: isLive ? "Stopped streaming" : "Started streaming",
        description: isLive ? "Camera is now offline" : "Camera is now live",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update camera status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleQRScan = (result: string) => {
    // Extract event code from QR result (assuming QR contains the event code)
    joinForm.setValue("eventCode", result);
    setShowQRScanner(false);
    findEventMutation.mutate(result);
  };

  const onJoinSubmit = (data: JoinCameraForm) => {
    findEventMutation.mutate(data.eventCode);
  };

  const onCameraSubmit = (data: CameraConfigForm) => {
    joinCameraMutation.mutate(data);
  };

  const handleGoLive = () => {
    updateCameraStatusMutation.mutate(!isLive);
  };

  return (
    <div className="min-h-screen bg-gray-800">
      {/* Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Video className="text-indigo-400 text-2xl" />
              <h1 className="text-xl font-bold">SportStream</h1>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/create" className="text-gray-300 hover:text-white transition-colors">
                Create Event
              </Link>
              <Link href="/join" className="text-gray-300 hover:text-white transition-colors">
                Join as Camera
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="py-12">
        <div className="container mx-auto px-4 max-w-md">
          <Card className="bg-gray-900 border-gray-700 shadow-2xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Smartphone className="text-green-500 text-4xl" />
              </div>
              <CardTitle className="text-3xl font-bold text-white">Join as Camera</CardTitle>
              <p className="text-gray-400">Connect your phone to the live stream</p>
            </CardHeader>

            <CardContent className="space-y-6">
              {!eventId && (
                <>
                  {/* QR Scanner Section */}
                  <div className="bg-gray-700 rounded-lg p-6">
                    <div className="text-center">
                      <QrCode className="mx-auto text-6xl text-gray-500 mb-4" />
                      <p className="text-gray-300 mb-4">Scan QR code from event organizer</p>
                      <Button
                        onClick={() => setShowQRScanner(true)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Open QR Scanner
                      </Button>
                    </div>
                  </div>

                  {/* Manual Entry */}
                  <div className="text-center text-gray-400">
                    <span>or</span>
                  </div>

                  <form onSubmit={joinForm.handleSubmit(onJoinSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="eventCode" className="text-white">Event Code</Label>
                      <Input
                        id="eventCode"
                        {...joinForm.register("eventCode")}
                        placeholder="BULLDOGS-VS-EAGLES-2025"
                        className="bg-gray-700 border-gray-600 text-white text-center font-mono focus:ring-green-500 focus:border-green-500"
                      />
                      {joinForm.formState.errors.eventCode && (
                        <p className="text-red-400 text-sm">{joinForm.formState.errors.eventCode.message}</p>
                      )}
                    </div>
                    
                    <Button
                      type="submit"
                      disabled={findEventMutation.isPending}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      {findEventMutation.isPending ? (
                        "Finding Event..."
                      ) : (
                        <>
                          <LinkIcon className="mr-2 h-4 w-4" />
                          Join Event
                        </>
                      )}
                    </Button>
                  </form>
                </>
              )}

              {eventId && !cameraDetails && (
                <form onSubmit={cameraForm.handleSubmit(onCameraSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="label" className="text-white">Camera Label</Label>
                    <Input
                      id="label"
                      {...cameraForm.register("label")}
                      placeholder="Main Camera"
                      className="bg-gray-700 border-gray-600 text-white focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="operatorName" className="text-white">Your Name (Optional)</Label>
                    <Input
                      id="operatorName"
                      {...cameraForm.register("operatorName")}
                      placeholder="John Doe"
                      className="bg-gray-700 border-gray-600 text-white focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={joinCameraMutation.isPending}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    {joinCameraMutation.isPending ? (
                      "Registering Camera..."
                    ) : (
                      <>
                        <Camera className="mr-2 h-4 w-4" />
                        Register Camera
                      </>
                    )}
                  </Button>
                </form>
              )}

              {cameraDetails && (
                <div className="space-y-6">
                  {/* Camera Preview */}
                  <div className="bg-black rounded-lg aspect-video flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <Video className="mx-auto text-3xl mb-2" />
                      <p>Camera Preview</p>
                      <p className="text-sm">Use RTMP streaming app</p>
                    </div>
                  </div>

                  {/* Stream Details */}
                  <div className="bg-gray-700 rounded-lg p-4 space-y-2">
                    <div>
                      <Label className="text-gray-400">Stream URL:</Label>
                      <p className="text-xs text-white font-mono break-all">{cameraDetails.ingestUrl}</p>
                    </div>
                    <div>
                      <Label className="text-gray-400">Stream Key:</Label>
                      <p className="text-xs text-white font-mono break-all">{cameraDetails.streamKey}</p>
                    </div>
                  </div>

                  {/* Go Live Button */}
                  <Button
                    onClick={handleGoLive}
                    disabled={updateCameraStatusMutation.isPending}
                    className={`w-full font-bold py-4 px-6 rounded-lg transition-all ${
                      isLive
                        ? "bg-red-600 hover:bg-red-700 animate-pulse"
                        : "bg-red-600 hover:bg-red-700"
                    }`}
                  >
                    {updateCameraStatusMutation.isPending ? (
                      "Updating..."
                    ) : (
                      <>
                        <Radio className="mr-2 h-5 w-5" />
                        {isLive ? "STOP STREAMING" : "GO LIVE"}
                      </>
                    )}
                  </Button>

                  <div className="text-center text-sm text-gray-400">
                    <p>Use an RTMP streaming app like Larix Broadcaster</p>
                    <p>Configure with the URL and key above</p>
                  </div>
                </div>
              )}

              {showQRScanner && (
                <QRScanner
                  onResult={handleQRScan}
                  onClose={() => setShowQRScanner(false)}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
