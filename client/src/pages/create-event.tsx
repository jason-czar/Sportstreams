import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertEventSchema } from "@shared/schema";
import { z } from "zod";
import { Video, Plus, Radio, KeyRound } from "lucide-react";
import { Link, useLocation } from "wouter";

const createEventFormSchema = insertEventSchema;

type CreateEventForm = z.infer<typeof createEventFormSchema>;

export default function CreateEvent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const form = useForm<CreateEventForm>({
    resolver: zodResolver(createEventFormSchema),
    defaultValues: {
      name: "",
      sportType: "",
      startDateTime: new Date(),
      duration: 2,
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: CreateEventForm) => {
      const response = await apiRequest("POST", "/api/events", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Event created successfully!",
        description: `Event code: ${data.eventCode}`,
      });
      setLocation(`/director/${data.eventId}`);
    },
    onError: (error) => {
      toast({
        title: "Error creating event",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateEventForm) => {
    createEventMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card className="bg-gray-800 border-gray-700 shadow-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Plus className="text-indigo-400 text-4xl" />
            </div>
            <CardTitle className="text-3xl font-bold text-white">Create New Event</CardTitle>
            <p className="text-gray-400">Set up your live sports broadcast</p>
          </CardHeader>

          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Event Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">Event Name</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="Bulldogs vs Eagles Championship"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {form.formState.errors.name && (
                  <p className="text-red-400 text-sm">{form.formState.errors.name?.message}</p>
                )}
              </div>

              {/* Sport Type */}
              <div className="space-y-2">
                <Label htmlFor="sportType" className="text-white">Sport Type</Label>
                <Select onValueChange={(value) => form.setValue("sportType", value)}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select Sport" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="football">Football</SelectItem>
                    <SelectItem value="basketball">Basketball</SelectItem>
                    <SelectItem value="soccer">Soccer</SelectItem>
                    <SelectItem value="baseball">Baseball</SelectItem>
                    <SelectItem value="volleyball">Volleyball</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.sportType && (
                  <p className="text-red-400 text-sm">{form.formState.errors.sportType?.message}</p>
                )}
              </div>

              {/* Date and Duration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDateTime" className="text-white">Start Date & Time</Label>
                  <Input
                    id="startDateTime"
                    type="datetime-local"
                    {...form.register("startDateTime", {
                      setValueAs: (value) => new Date(value),
                    })}
                    className="bg-gray-700 border-gray-600 text-white focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-white">Duration (hours)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="0.5"
                    max="8"
                    step="0.5"
                    {...form.register("duration", {
                      setValueAs: (value) => parseFloat(value),
                    })}
                    placeholder="2"
                    className="bg-gray-700 border-gray-600 text-white focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-white">Description (Optional)</Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  placeholder="Tell viewers what to expect from this event..."
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 min-h-[80px]"
                />
              </div>

              {/* Auto-Streaming Info */}
              <div className="bg-gray-700 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <Radio className="text-green-500 mr-2" />
                  <h3 className="text-lg font-semibold text-white">
                    Live Streaming
                  </h3>
                </div>
                <div className="space-y-2 text-gray-300">
                  <p className="flex items-center">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                    Auto-streams to SportStream YouTube
                  </p>
                  <p className="flex items-center">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                    Auto-streams to SportStream Twitch
                  </p>
                  <p className="text-sm text-gray-400 mt-3">
                    Your event will automatically broadcast on our official channels for maximum reach
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={createEventMutation.isPending}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-6 rounded-lg transition-all transform hover:scale-[1.02] focus:ring-4 focus:ring-indigo-500 focus:ring-opacity-50"
              >
                {createEventMutation.isPending ? (
                  "Creating Event..."
                ) : (
                  <>
                    <Video className="mr-2 h-5 w-5" />
                    Create Event
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}