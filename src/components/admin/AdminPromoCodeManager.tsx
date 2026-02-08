import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-proxy-client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Copy, Trash2, Gift, Percent, Calendar, Hash, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

interface PromoCode {
  id: string;
  code: string;
  type: string;
  discount_percentage: number;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  description: string | null;
}

function generateRandomCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function AdminPromoCodeManager() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();

  // New code form state
  const [newCode, setNewCode] = useState({
    code: '',
    type: 'gift',
    discount_percentage: 100,
    max_uses: '',
    expires_at: '',
    description: '',
  });

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (error: any) {
      console.error('Error fetching promo codes:', error);
      toast({
        title: "Error",
        description: "Failed to load promo codes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateCode = () => {
    setNewCode(prev => ({ ...prev, code: generateRandomCode() }));
  };

  const handleCreateCode = async () => {
    if (!newCode.code.trim()) {
      toast({
        title: "Error",
        description: "Please enter a code",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('promo_codes').insert({
        code: newCode.code.toUpperCase(),
        type: newCode.type,
        discount_percentage: newCode.type === 'gift' ? 100 : newCode.discount_percentage,
        max_uses: newCode.max_uses ? parseInt(newCode.max_uses) : null,
        expires_at: newCode.expires_at || null,
        description: newCode.description || null,
        created_by: user.user?.id,
      });

      if (error) throw error;

      toast({
        title: "Code Created!",
        description: `Promo code ${newCode.code} has been created.`,
      });

      setShowCreateDialog(false);
      setNewCode({
        code: '',
        type: 'gift',
        discount_percentage: 100,
        max_uses: '',
        expires_at: '',
        description: '',
      });
      fetchCodes();
    } catch (error: any) {
      console.error('Error creating promo code:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create promo code",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (code: PromoCode) => {
    try {
      const { error } = await supabase
        .from('promo_codes')
        .update({ is_active: !code.is_active })
        .eq('id', code.id);

      if (error) throw error;
      fetchCodes();
    } catch (error) {
      console.error('Error toggling code:', error);
    }
  };

  const handleDeleteCode = async (id: string) => {
    if (!confirm('Are you sure you want to delete this code?')) return;

    try {
      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "Promo code has been deleted.",
      });
      fetchCodes();
    } catch (error) {
      console.error('Error deleting code:', error);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: `Code ${code} copied to clipboard.`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const giftCodes = codes.filter(c => c.type === 'gift');
  const discountCodes = codes.filter(c => c.type === 'discount');
  const activeCodes = codes.filter(c => c.is_active);
  const totalRedemptions = codes.reduce((acc, c) => acc + c.uses_count, 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{giftCodes.length}</p>
                <p className="text-xs text-muted-foreground">Gift Codes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{discountCodes.length}</p>
                <p className="text-xs text-muted-foreground">Discount Codes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{activeCodes.length}</p>
                <p className="text-xs text-muted-foreground">Active Codes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{totalRedemptions}</p>
                <p className="text-xs text-muted-foreground">Total Uses</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Code Button */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Create Promo Code
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Promo Code</DialogTitle>
            <DialogDescription>
              Create a gift code (100% off) or discount code for Premium.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Code */}
            <div className="space-y-2">
              <Label>Code</Label>
              <div className="flex gap-2">
                <Input
                  value={newCode.code}
                  onChange={(e) => setNewCode(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="PREMIUM2024"
                  className="font-mono"
                />
                <Button variant="outline" size="icon" onClick={handleGenerateCode}>
                  <Hash className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={newCode.type}
                onValueChange={(value) => setNewCode(prev => ({ 
                  ...prev, 
                  type: value,
                  discount_percentage: value === 'gift' ? 100 : prev.discount_percentage
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gift">
                    <span className="flex items-center gap-2">
                      <Gift className="w-4 h-4" /> Gift Code (100% off)
                    </span>
                  </SelectItem>
                  <SelectItem value="discount">
                    <span className="flex items-center gap-2">
                      <Percent className="w-4 h-4" /> Discount Code
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Discount Percentage (only for discount type) */}
            {newCode.type === 'discount' && (
              <div className="space-y-2">
                <Label>Discount Percentage</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="99"
                    value={newCode.discount_percentage}
                    onChange={(e) => setNewCode(prev => ({ ...prev, discount_percentage: parseInt(e.target.value) || 0 }))}
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>
            )}

            {/* Max Uses */}
            <div className="space-y-2">
              <Label>Max Uses (optional)</Label>
              <Input
                type="number"
                min="1"
                value={newCode.max_uses}
                onChange={(e) => setNewCode(prev => ({ ...prev, max_uses: e.target.value }))}
                placeholder="Unlimited"
              />
            </div>

            {/* Expiry Date */}
            <div className="space-y-2">
              <Label>Expires At (optional)</Label>
              <Input
                type="datetime-local"
                value={newCode.expires_at}
                onChange={(e) => setNewCode(prev => ({ ...prev, expires_at: e.target.value }))}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={newCode.description}
                onChange={(e) => setNewCode(prev => ({ ...prev, description: e.target.value }))}
                placeholder="e.g., Giveaway for Discord event"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCode} disabled={isCreating}>
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Codes Table */}
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>All Promo Codes</CardTitle>
          <CardDescription>Manage gift codes and discount codes for Premium</CardDescription>
        </CardHeader>
        <CardContent>
          {codes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No promo codes yet. Create your first one!
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="font-mono bg-muted px-2 py-1 rounded text-sm">
                          {code.code}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyCode(code.code)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={code.type === 'gift' ? 'default' : 'secondary'}>
                        {code.type === 'gift' ? (
                          <><Gift className="w-3 h-3 mr-1" /> Gift</>
                        ) : (
                          <><Percent className="w-3 h-3 mr-1" /> Discount</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>{code.discount_percentage}%</TableCell>
                    <TableCell>
                      {code.uses_count}
                      {code.max_uses ? ` / ${code.max_uses}` : ''}
                    </TableCell>
                    <TableCell>
                      {code.expires_at ? (
                        <span className="flex items-center gap-1 text-sm">
                          <Calendar className="w-3 h-3" />
                          {new Date(code.expires_at).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={code.is_active}
                        onCheckedChange={() => handleToggleActive(code)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteCode(code.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}