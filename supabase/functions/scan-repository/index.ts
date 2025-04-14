
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, extractRepoName, supabase } from "./utils.ts";
import { performScan } from "./scanService.ts";
import { ScanRequest } from "./types.ts";

// Main handler function
serve(async (req) => {
  // Handle OPTIONS request for CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    console.log("Received scan request");
    const requestData = await req.json();
    const { repositoryUrl, scannerTypes, repositoryId } = requestData;
    
    // Validate input
    if (!repositoryUrl) {
      return new Response(
        JSON.stringify({ error: "Repository URL is required" }),
        { headers: corsHeaders, status: 400 }
      );
    }

    if (!scannerTypes || !Array.isArray(scannerTypes) || scannerTypes.length === 0) {
      return new Response(
        JSON.stringify({ error: "At least one scanner type is required" }),
        { headers: corsHeaders, status: 400 }
      );
    }

    console.log(`Processing scan for repo: ${repositoryUrl} with scanners: ${scannerTypes.join(', ')}`);
    
    // Create or get repository record if not provided
    let repoId = repositoryId;
    
    if (!repoId) {
      try {
        // Extract repository name from URL
        const repoName = extractRepoName(repositoryUrl);
        
        // Create a repository record
        const { data: repoData, error: repoError } = await supabase
          .from('repositories')
          .insert([{ 
            name: repoName,
            url: repositoryUrl,
            last_scanned_at: new Date().toISOString()
          }])
          .select()
          .single();
        
        if (repoError) {
          console.error("Error creating repository record:", repoError);
          return new Response(
            JSON.stringify({ error: "Failed to create repository record", details: repoError }),
            { headers: corsHeaders, status: 500 }
          );
        }
        
        repoId = repoData.id;
      } catch (error) {
        console.error("Error handling repository:", error);
        return new Response(
          JSON.stringify({ 
            error: "Failed to process repository", 
            details: error instanceof Error ? error.message : String(error) 
          }),
          { headers: corsHeaders, status: 500 }
        );
      }
    }
    
    // Prepare the scan request
    const scanRequest: ScanRequest = {
      repositoryUrl,
      scannerTypes,
      repositoryId: repoId
    };
    
    try {
      // Perform the scan
      const scanResult = await performScan(scanRequest);
      return new Response(
        JSON.stringify(scanResult),
        { headers: corsHeaders }
      );
    } catch (error) {
      console.error("Error during scanning process:", error);
      return new Response(
        JSON.stringify({ 
          error: "Error during scanning", 
          details: error instanceof Error ? error.message : String(error)
        }),
        { headers: corsHeaders, status: 500 }
      );
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal Server Error", 
        details: error instanceof Error ? error.message : String(error) 
      }),
      { headers: corsHeaders, status: 500 }
    );
  }
});
