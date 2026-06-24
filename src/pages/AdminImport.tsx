import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Upload, CheckCircle, XCircle, Loader2, ShieldAlert } from "lucide-react";
interface ImportResult {
  fileName: string;
  status: 'pending' | 'importing' | 'success' | 'error';
  message?: string;
  count?: number;
}

// Helper function to parse CSV with quoted fields
function parseCSVLine(line: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current.trim());
  
  return parts;
}

// Helper function to parse price strings
function parsePrice(priceStr: string): number {
  if (!priceStr) return 0;
  return parseFloat(priceStr.replace(/[$,\s]/g, '')) || 0;
}

function parseCSV(csvContent: string) {
  const lines = csvContent.trim().split('\n');
  const items: any[] = [];
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = parseCSVLine(line);
    
    // CSV columns: Client Id, Bulk Recommerce Short Id (Pallet ID), Product SKU, Product Name, Original Price (MSRP), Primary Image, Category Name
    if (parts.length < 7) continue;
    
    const palletId = parts[1]; // Bulk Recommerce Short Id is the pallet ID
    const productSku = parts[2];
    const productName = parts[3];
    const originalPrice = parsePrice(parts[4]);
    const primaryImage = parts[5] || null;
    const categoryName = parts[6] || null;
    
    // Skip if essential fields are missing
    if (!palletId || !productSku || !productName || originalPrice === 0) continue;
    
    items.push({
      pallet_id: palletId,
      product_sku: productSku,
      product_name: productName,
      original_price: originalPrice,
      primary_image: primaryImage,
      category_name: categoryName,
    });
  }
  
  return items;
}

export default function AdminImport() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [results, setResults] = useState<ImportResult[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);

  // Check if user has admin role
  useEffect(() => {
    async function checkAdminRole() {
      if (!user) {
        setCheckingRole(false);
        setIsAdmin(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        if (error) {
          setIsAdmin(false);
        } else {
          setIsAdmin(data === true);
        }
      } catch {
        setIsAdmin(false);
      } finally {
        setCheckingRole(false);
      }
    }

    checkAdminRole();
  }, [user]);

  // Show loading state while checking role
  if (checkingRole) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  // Show access denied if not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <ShieldAlert className="h-6 w-6" />
                Access Denied
              </CardTitle>
              <CardDescription>
                You do not have permission to access this page. Admin privileges are required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                Return to Home
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }
  
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    
    // Initialize results
    setResults(fileArray.map(f => ({
      fileName: f.name,
      status: 'pending'
    })));
    
    setIsImporting(true);
    
    // Process each file
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      
      // Update status to importing
      setResults(prev => prev.map((r, idx) => 
        idx === i ? { ...r, status: 'importing' } : r
      ));
      
      try {
        const content = await file.text();
        const items = parseCSV(content);
        
        if (items.length === 0) {
          setResults(prev => prev.map((r, idx) => 
            idx === i ? { ...r, status: 'error', message: 'No valid items found' } : r
          ));
          continue;
        }
        
        // Insert in batches of 500
        const batchSize = 500;
        let insertedCount = 0;
        
        for (let j = 0; j < items.length; j += batchSize) {
          const batch = items.slice(j, j + batchSize);
          
          const { error } = await supabase
            .from('pallet_items')
            .insert(batch);
          
          if (error) {
            throw new Error(error.message);
          }
          
          insertedCount += batch.length;
        }
        
        setResults(prev => prev.map((r, idx) => 
          idx === i ? { ...r, status: 'success', count: insertedCount, message: `Imported ${insertedCount} items` } : r
        ));
        
      } catch (error: any) {
        setResults(prev => prev.map((r, idx) => 
          idx === i ? { ...r, status: 'error', message: error.message } : r
        ));
      }
    }
    
    setIsImporting(false);
    toast({
      title: "Import Complete",
      description: `Processed ${fileArray.length} file(s)`,
    });
  };
  
  const totalImported = results.reduce((sum, r) => sum + (r.count || 0), 0);
  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-6 w-6" />
              Import Pallet Items
            </CardTitle>
            <CardDescription>
              Upload CSV files to import pallet items into the database.
              Select multiple files to import them all at once.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="csv-upload" className="block text-sm font-medium">
                Select CSV Files
              </label>
              <Input
                id="csv-upload"
                type="file"
                accept=".csv"
                multiple
                onChange={handleFileSelect}
                disabled={isImporting}
              />
              <p className="text-sm text-muted-foreground">
                Expected columns: Client Id, Bulk Recommerce Short Id, Product SKU, Product Name, Original Price (MSRP), Primary Image, Category Name
              </p>
            </div>
            
            {results.length > 0 && (
              <div className="space-y-4">
                <div className="flex gap-4 text-sm">
                  <span className="text-primary font-medium">{successCount} successful</span>
                  {errorCount > 0 && <span className="text-destructive font-medium">{errorCount} failed</span>}
                  <span className="text-muted-foreground">Total items: {totalImported}</span>
                </div>
                
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {results.map((result, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                    >
                      {result.status === 'pending' && (
                        <div className="h-5 w-5 rounded-full border-2 border-muted" />
                      )}
                      {result.status === 'importing' && (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      )}
                      {result.status === 'success' && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                      {result.status === 'error' && (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{result.fileName}</p>
                        {result.message && (
                          <p className={`text-sm ${result.status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {result.message}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
