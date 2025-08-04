import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWebSocket } from "@/lib/websocket";
import { type Event, type Camera } from "@shared/schema";
import { Video, Eye, Clock, Play, VolumeX, Volume2, Maximize, Send } from "lucide-react";
import { Link } from "wouter";

interface ViewerProps {
  eventId: string;
}

interface ChatMessage {
  id: string;
  user: string;
  text: string;
  time: string;
  avatar: string;
}

export default function Viewer({ eventId }: ViewerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      user: "JohnSports",
      text: "Great camera work! 🔥",
      time: "2m",
      avatar: "JS"
    },
    {
      id: "2", 
      user: "SportsFan99",
      text: "Love the multiple angles!",
      time: "1m",
      avatar: "SF"
    },
    {
      id: "3",
      user: "TeamCaptain",
      text: "Let's go Bulldogs! 🐕",
      time: "30s",
      avatar: "TC"
    }
  ]);
  const [viewerCount, setViewerCount] = useState(847);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isConnected, sendMessage } = useWebSocket(`/ws`);

  const { data: event, isLoading } = useQuery<Event & { cameras: Camera[] }>({
    queryKey: ["/api/events", eventId],
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (isConnected && eventId) {
      sendMessage({
        type: "join_event",
        eventId,
        userId: "viewer",
      });
    }
  }, [isConnected, eventId, sendMessage]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const sendChatMessage = () => {
    if (chatMessage.trim()) {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        user: "You",
        text: chatMessage,
        time: "now",
        avatar: "Y"
      };
      setChatMessages(prev => [newMessage, ...prev]);
      setChatMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      sendChatMessage();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-800 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-800 flex items-center justify-center">
        <div className="text-white">Event not found</div>
      </div>
    );
  }

  const playbackUrl = event.playbackId ? `https://stream.mux.com/${event.playbackId}.m3u8` : '';
  const activeCamera = event.cameras.find(c => c.id === event.activeCamera);

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
              <Link href={`/director/${eventId}`} className="text-gray-300 hover:text-white transition-colors">
                Director
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Video Player */}
            <div className="lg:col-span-3">
              <Card className="bg-black border-gray-700 shadow-2xl">
                <div className="aspect-video relative">
                  {playbackUrl ? (
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      src={playbackUrl}
                      poster="https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=1200&h=675"
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    />
                  ) : (
                    <img
                      src="https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=1200&h=675"
                      alt="Live sports game action"
                      className="w-full h-full object-cover"
                    />
                  )}
                  
                  {/* Video Controls Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={togglePlay}
                          className="text-white hover:text-gray-300"
                        >
                          <Play className="h-5 w-5" />
                        </Button>
                        <div className="flex items-center space-x-2 text-white">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={toggleMute}
                            className="text-white hover:text-gray-300"
                          >
                            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                          </Button>
                          <div className="w-20 h-1 bg-gray-600 rounded">
                            <div className="w-3/4 h-full bg-white rounded"></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        {event.status === "live" && (
                          <div className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-1 inline-block"></div>
                            LIVE
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={toggleFullscreen}
                          className="text-white hover:text-gray-300"
                        >
                          <Maximize className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Stream Info */}
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold mb-2 text-white">{event.name}</h2>
                  <div className="flex flex-wrap items-center gap-4 text-gray-400">
                    <div className="flex items-center space-x-2">
                      <Eye className="h-4 w-4" />
                      <span>{viewerCount} watching</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>Started 45 min ago</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Video className="h-4 w-4" />
                      <span>{activeCamera?.label || "No active camera"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chat Sidebar */}
            <div className="lg:col-span-1">
              <Card className="bg-gray-900 border-gray-700 shadow-2xl h-full flex flex-col">
                <CardHeader className="border-b border-gray-700">
                  <CardTitle className="text-white">Live Chat</CardTitle>
                  <p className="text-sm text-gray-400">{viewerCount} watching</p>
                </CardHeader>
                
                {/* Chat Messages */}
                <div className="flex-1 p-4 space-y-3 overflow-y-auto" style={{ maxHeight: "400px" }}>
                  {chatMessages.map((message) => (
                    <div key={message.id} className="flex space-x-3">
                      <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
                        {message.avatar}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-sm text-white">{message.user}</span>
                          <span className="text-xs text-gray-500">{message.time}</span>
                        </div>
                        <p className="text-sm text-gray-300">{message.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Chat Input */}
                <div className="p-4 border-t border-gray-700">
                  <div className="flex space-x-2">
                    <Input
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Say something..."
                      className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <Button
                      onClick={sendChatMessage}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Related Content */}
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4 text-white">Related Streams</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: "Eagles vs Hawks Basketball",
                  viewers: "234 viewers",
                  duration: "1:23:45",
                  image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=400&h=225"
                },
                {
                  title: "Soccer Championship Finals",
                  viewers: "456 viewers", 
                  duration: "2:15:30",
                  image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=400&h=225"
                },
                {
                  title: "Volleyball Tournament",
                  viewers: "123 viewers",
                  duration: "0:45:12", 
                  image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=400&h=225"
                }
              ].map((stream, index) => (
                <Card key={index} className="bg-gray-900 border-gray-700 cursor-pointer hover:shadow-xl transition-all">
                  <div className="aspect-video relative">
                    <img
                      src={stream.image}
                      alt={stream.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-xs">
                      <span>{stream.duration}</span>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-1 text-white">{stream.title}</h4>
                    <p className="text-sm text-gray-400">{stream.viewers}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
