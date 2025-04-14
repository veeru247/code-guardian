
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AlertTriangle, Github, Upload, Wand2 } from 'lucide-react';
import { useScanner } from '@/context/ScannerContext';
import { ScannerType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { FileUpload } from '@/components/FileUpload';
import { toast } from '@/hooks/use-toast';

// Repository validation schema
const formSchema = z.object({
  repositoryUrl: z.string().url('Please enter a valid URL'),
  scanners: z.array(z.string()).min(1, 'Select at least one scanner'),
});

// Local files validation schema
const localFilesSchema = z.object({
  scanners: z.array(z.string()).min(1, 'Select at least one scanner'),
});

// Scanner options
const scannerOptions = [
  {
    id: 'trufflehog',
    label: 'TruffleHog',
    description: 'Searches for high-entropy strings and patterns that typically indicate secrets'
  },
  {
    id: 'gitleaks',
    label: 'Gitleaks',
    description: 'Scans for credentials and secrets in Git repos with regex pattern matching'
  },
];

export const RepositoryForm = () => {
  const [activeTab, setActiveTab] = useState<'repository' | 'local'>('repository');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  
  const { startScan, startLocalScan, isScanning } = useScanner();
  
  // Repository scan form
  const repoForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      repositoryUrl: '',
      scanners: ['trufflehog', 'gitleaks'],
    },
  });
  
  // Local files scan form
  const localForm = useForm<z.infer<typeof localFilesSchema>>({
    resolver: zodResolver(localFilesSchema),
    defaultValues: {
      scanners: ['trufflehog', 'gitleaks'],
    },
  });
  
  // Handle repository scan submission
  const onRepoSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await startScan(
        values.repositoryUrl, 
        values.scanners as ScannerType[]
      );
    } catch (error) {
      toast({
        title: "Scan Failed",
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: "destructive",
      });
    }
  };
  
  // Handle local files scan submission
  const onLocalFilesSubmit = async (values: z.infer<typeof localFilesSchema>) => {
    try {
      if (uploadedFiles.length === 0) {
        toast({
          title: "No Files Selected",
          description: "Please upload at least one file to scan",
          variant: "destructive",
        });
        return;
      }
      
      await startLocalScan(
        uploadedFiles, 
        values.scanners as ScannerType[]
      );
    } catch (error) {
      toast({
        title: "Scan Failed",
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: "destructive",
      });
    }
  };
  
  const handleFilesSelected = (files: File[]) => {
    setUploadedFiles(files);
  };
  
  return (
    <div className="space-y-6">
      <Card className="bg-scanner-dark border-scanner-secondary">
        <CardHeader>
          <CardTitle className="text-xl text-white">Scan for Secrets</CardTitle>
          <CardDescription>
            Detect secrets, API keys, and credentials in your code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="repository" className="w-full" onValueChange={(value) => setActiveTab(value as 'repository' | 'local')}>
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="repository" className="data-[state=active]:bg-scanner-primary">
                <Github className="h-4 w-4 mr-2" />
                Repository
              </TabsTrigger>
              <TabsTrigger value="local" className="data-[state=active]:bg-scanner-primary">
                <Upload className="h-4 w-4 mr-2" />
                Local Files
              </TabsTrigger>
            </TabsList>
            
            {/* Repository Tab */}
            <TabsContent value="repository">
              <Form {...repoForm}>
                <form onSubmit={repoForm.handleSubmit(onRepoSubmit)} className="space-y-6">
                  <FormField
                    control={repoForm.control}
                    name="repositoryUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GitHub Repository URL</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://github.com/username/repository" 
                            {...field}
                            className="border-scanner-secondary"
                          />
                        </FormControl>
                        <FormDescription>
                          Enter a GitHub repository URL to scan
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="space-y-2">
                    <FormLabel>Scanners</FormLabel>
                    <div className="grid grid-cols-1 gap-4">
                      {scannerOptions.map((option) => (
                        <FormField
                          key={option.id}
                          control={repoForm.control}
                          name="scanners"
                          render={({ field }) => (
                            <FormItem
                              className="flex flex-row items-start space-x-3 space-y-0 p-3 border border-scanner-secondary rounded-md"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(option.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, option.id])
                                      : field.onChange(field.value?.filter((value) => value !== option.id))
                                  }}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-white">
                                  {option.label}
                                </FormLabel>
                                <FormDescription>
                                  {option.description}
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </div>
                  
                  <Alert className="bg-scanner-dark border-scanner-warning">
                    <AlertTriangle className="h-4 w-4 text-scanner-warning" />
                    <AlertTitle className="text-scanner-warning">Repository Access</AlertTitle>
                    <AlertDescription className="text-gray-400">
                      The repository must be public or you must have access to it. Private repositories 
                      require authentication.
                    </AlertDescription>
                  </Alert>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-scanner-primary hover:bg-scanner-secondary"
                    disabled={isScanning}
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    Start Repository Scan
                  </Button>
                </form>
              </Form>
            </TabsContent>
            
            {/* Local Files Tab */}
            <TabsContent value="local">
              <Form {...localForm}>
                <form onSubmit={localForm.handleSubmit(onLocalFilesSubmit)} className="space-y-6">
                  <FormField
                    control={localForm.control}
                    name="scanners"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel>Upload Files</FormLabel>
                          <FormDescription className="mb-2">
                            Select files from your computer to scan for secrets
                          </FormDescription>
                          <FileUpload 
                            onFilesSelected={handleFilesSelected} 
                            maxFiles={50}
                            maxSizeMB={5}
                          />
                        </div>
                        
                        <Separator className="my-4 bg-scanner-secondary" />
                        
                        <div className="space-y-2">
                          <FormLabel>Scanners</FormLabel>
                          <div className="grid grid-cols-1 gap-4">
                            {scannerOptions.map((option) => (
                              <FormField
                                key={option.id}
                                control={localForm.control}
                                name="scanners"
                                render={({ field }) => (
                                  <FormItem
                                    className="flex flex-row items-start space-x-3 space-y-0 p-3 border border-scanner-secondary rounded-md"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(option.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, option.id])
                                            : field.onChange(field.value?.filter((value) => value !== option.id))
                                        }}
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel className="text-white">
                                        {option.label}
                                      </FormLabel>
                                      <FormDescription>
                                        {option.description}
                                      </FormDescription>
                                    </div>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-scanner-primary hover:bg-scanner-secondary"
                    disabled={isScanning || uploadedFiles.length === 0}
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    Start Local Files Scan
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
