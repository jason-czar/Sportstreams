import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useWebSocket } from "@/lib/websocket";
import { type Event, type Camera } from "@shared/schema";
import { Video, Play, Square, Share, Eye, Clock, Users } from "lucide-react";
import { Link } from "wouter";

interface DirectorDashboardProps {
  eventId: string;
}

export default function DirectorDashboard({ eventId }: DirectorDashboardProps) {
  const { toast } = useToast();
  const [viewerCount, setViewerCount] = useState(847);
  const { isConnected, sendMessage } = useWebSocket(`/ws`);

  const { data: event, isLoading } = useQuery<Event & { cameras: Camera[] }>({
    queryKey: ["/api/events", eventId],
    refetchInterval: 5000,
  });

  const startStreamMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/events/${eventId}/start`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Stream started!",
        description: "Live broadcast is now active",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
    },
    onError: (error) => {
      toast({
        title: "Failed to start stream",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const stopStreamMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/events/${eventId}/stop`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Stream stopped",
        description: "Live broadcast has ended",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
    },
    onError: (error) => {
      toast({
        title: "Failed to stop stream",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const switchCameraMutation = useMutation({
    mutationFn: async (cameraId: string) => {
      const response = await apiRequest("PATCH", `/api/events/${eventId}/switch`, {
        cameraId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
    },
    onError: (error) => {
      toast({
        title: "Failed to switch camera",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addSimulcastMutation = useMutation({
    mutationFn: async () => {
      if (!event?.youtubeKey && !event?.twitchKey) {
        throw new Error("No streaming keys configured");
      }
      
      const response = await apiRequest("POST", `/api/events/${eventId}/simulcast`, {
        youtubeKey: event.youtubeKey,
        twitchKey: event.twitchKey,
      });
      return response.json();
    },
    onSuccess: (data) => {
      const successCount = data.results.filter((r: any) => r.status === "added").length;
      toast({
        title: "Simulcast configured",
        description: `${successCount} platform(s) connected`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add simulcast",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (isConnected && eventId) {
      sendMessage({
        type: "join_event",
        eventId,
        userId: "director",
      });
    }
  }, [isConnected, eventId, sendMessage]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Event not found</div>
      </div>
    );
  }

  const liveCameras = event.cameras.filter(camera => camera.isLive);
  const availableSlots = 9 - event.cameras.length;

  return (
    <div className="min-h-screen bg-gray-900">
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
              <Link href={`/viewer/${eventId}`} className="text-gray-300 hover:text-white transition-colors">
                Viewer
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Director Dashboard</h2>
              <p className="text-gray-400">{event.name}</p>
            </div>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              {event.status === "live" && (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-white">LIVE</span>
                </div>
              )}
              <div className="text-sm text-gray-400 flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>{viewerCount} viewers</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stream Controls */}
        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4">
              <Button
                onClick={() => startStreamMutation.mutate()}
                disabled={startStreamMutation.isPending || event.status === "live"}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Play className="mr-2 h-4 w-4" />
                Start Stream
              </Button>
              
              <Button
                onClick={() => addSimulcastMutation.mutate()}
                disabled={addSimulcastMutation.isPending || event.status !== "idle"}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Share className="mr-2 h-4 w-4" />
                Add Simulcast
              </Button>
              
              <Button
                onClick={() => stopStreamMutation.mutate()}
                disabled={stopStreamMutation.isPending || event.status !== "live"}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                <Square className="mr-2 h-4 w-4" />
                End Stream
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Camera Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {event.cameras.map((camera) => (
            <Card
              key={camera.id}
              className={`bg-gray-800 border-gray-700 cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all ${
                event.activeCamera === camera.id ? "ring-2 ring-green-500" : ""
              }`}
              onClick={() => switchCameraMutation.mutate(camera.id)}
            >
              <div className="aspect-video bg-black relative">
                <img
                  src="https://images.unsplash.com/photo-1560272564-c83b66b1ad12?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=450"
                  alt={`Live camera feed from ${camera.label}`}
                  className="w-full h-full object-cover"
                />
                
                {camera.isLive && (
                  <Badge className="absolute top-3 left-3 bg-red-500 text-white">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-1"></div>
                    LIVE
                  </Badge>
                )}
                
                {event.activeCamera === camera.id && (
                  <div className="absolute top-3 right-3 bg-green-600 w-8 h-8 rounded-full flex items-center justify-center">
                    <Eye className="text-white text-sm" />
                  </div>
                )}
              </div>
              
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">{camera.label}</h3>
                  <span className="text-sm text-gray-400">{camera.quality}</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">{camera.operatorName || "Unknown operator"}</p>
              </CardContent>
            </Card>
          ))}

          {/* Placeholder slots */}
          {Array.from({ length: Math.min(availableSlots, 3) }).map((_, index) => (
            <Card key={`placeholder-${index}`} className="bg-gray-700 border-dashed border-gray-600">
              <div className="aspect-video flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Video className="mx-auto text-3xl mb-2" />
                  <p>Waiting for cameras...</p>
                  <p className="text-sm">{availableSlots} slots available</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Stream Status */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Stream Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gray-700 border-gray-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">YouTube</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-white">Connected</span>
                    </div>
                  </div>
                  <p className="text-2xl font-bold mt-2 text-white">523</p>
                  <p className="text-xs text-gray-400">viewers</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-700 border-gray-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Twitch</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-white">Connected</span>
                    </div>
                  </div>
                  <p className="text-2xl font-bold mt-2 text-white">324</p>
                  <p className="text-xs text-gray-400">viewers</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-700 border-gray-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Latency</span>
                    <span className="text-green-500 text-sm">Good</span>
                  </div>
                  <p className="text-2xl font-bold mt-2 text-white">3.2s</p>
                  <p className="text-xs text-gray-400">end-to-end</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
