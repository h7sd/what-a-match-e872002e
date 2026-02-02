import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Receipt, Search, CreditCard, User, Calendar, Euro } from "lucide-react";
import { format } from "date-fns";
import { maskEmail } from "@/lib/utils/maskEmail";

interface Purchase {
  id: string;
  user_id: string;
  username: string;
  email: string;
  order_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  invoice_number: string;
  status: string;
  created_at: string;
}

export function AdminPurchaseHistory() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    try {
      const { data, error } = await supabase
        .from("purchases")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching purchases:", error);
        return;
      }

      setPurchases(data || []);
      
      // Calculate total revenue
      const total = (data || []).reduce((sum, p) => sum + Number(p.amount), 0);
      setTotalRevenue(total);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPurchases = purchases.filter(
    (p) =>
      p.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.order_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            Purchase History
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {purchases.length} orders
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card/50 rounded-lg p-3 border border-border/50">
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="text-lg font-bold text-green-500">€{totalRevenue.toFixed(2)}</p>
          </div>
          <div className="bg-card/50 rounded-lg p-3 border border-border/50">
            <p className="text-xs text-muted-foreground">Total Orders</p>
            <p className="text-lg font-bold text-primary">{purchases.length}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by username, email, or invoice..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Purchases List */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filteredPurchases.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-4">
              {searchTerm ? "No purchases found" : "No purchases yet"}
            </p>
          ) : (
            filteredPurchases.map((purchase) => (
              <div
                key={purchase.id}
                className="bg-card/30 border border-border/50 rounded-lg p-3 hover:bg-card/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <span className="font-medium text-sm truncate">@{purchase.username}</span>
                      <Badge 
                        variant={purchase.status === "completed" ? "default" : "secondary"}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {purchase.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{maskEmail(purchase.email)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-500">€{Number(purchase.amount).toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">{purchase.currency}</p>
                  </div>
                </div>
                
                <div className="mt-2 pt-2 border-t border-border/30 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Receipt className="w-3 h-3" />
                    <span className="truncate">{purchase.invoice_number}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <CreditCard className="w-3 h-3" />
                    <span>{purchase.payment_method}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground col-span-2">
                    <Calendar className="w-3 h-3" />
                    <span>{format(new Date(purchase.created_at), "MMM d, yyyy 'at' HH:mm")}</span>
                  </div>
                </div>
                
                <div className="mt-2 text-[10px] text-muted-foreground/60 truncate">
                  Order: {purchase.order_id}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
