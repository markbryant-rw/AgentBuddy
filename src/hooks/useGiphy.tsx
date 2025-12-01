import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface GiphyGif {
  id: string;
  title: string;
  images: {
    fixed_height: {
      url: string;
      width: string;
      height: string;
    };
    original: {
      url: string;
      width: string;
      height: string;
    };
  };
}

interface GiphyResponse {
  data: GiphyGif[];
}

export const useGiphy = () => {
  const [isLoading, setIsLoading] = useState(false);

  const searchGifs = async (query: string): Promise<GiphyGif[]> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('giphy-search', {
        body: { query, type: 'search' }
      });

      if (error) throw error;
      
      const response = data as GiphyResponse;
      return response.data;
    } catch (error) {
      console.error("Failed to search GIFs:", error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const getTrending = async (): Promise<GiphyGif[]> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('giphy-search', {
        body: { type: 'trending' }
      });

      if (error) throw error;

      const response = data as GiphyResponse;
      return response.data;
    } catch (error) {
      console.error("Failed to get trending GIFs:", error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return {
    searchGifs,
    getTrending,
    isLoading,
  };
};
