import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Settings, History, MapPin, Users, Heart, Home, Loader2, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";

export default function Profile() {
  const [_, setLocation] = useLocation();
  const { profile, user, logout, devoteeData, devoteeLoading, refreshDevoteeData } = useAuth();

  const displayName = devoteeData?.name || profile?.name || user?.displayName || "Devotee";
  const email = devoteeData?.email || profile?.email || user?.email || "";
  const phone = devoteeData?.mobile || profile?.phone || "";
  const initials = displayName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const formatCurrency = (amount: string | number | null) => {
    if (amount === null || amount === undefined) return "₹0";
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(numAmount);
  };

  return (
    <div className="pb-24 md:pb-8">
      {/* Profile Header */}
      <div className="bg-primary pt-12 pb-20 px-6 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10 flex items-center gap-4">
          <Avatar className="h-20 w-20 border-4 border-white/20 shadow-xl" data-testid="img-avatar">
            <AvatarImage src={user?.photoURL || undefined} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-2xl font-serif font-bold" data-testid="text-username">{displayName}</h1>
            <p className="opacity-90 text-sm" data-testid="text-email">{email}</p>
            {phone && <p className="opacity-80 text-xs mt-1" data-testid="text-phone">{phone}</p>}
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white/80 hover:text-white hover:bg-white/10"
            onClick={refreshDevoteeData}
            disabled={devoteeLoading}
            data-testid="button-refresh"
          >
            <RefreshCw className={`h-5 w-5 ${devoteeLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-4 -mt-10 relative z-20 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Card className="shadow-lg border-none bg-gradient-to-br from-orange-50 to-white" data-testid="card-seva-summary">
            <CardContent className="p-4 text-center">
              <History className="h-6 w-6 mx-auto text-primary mb-2" />
              <div className="text-2xl font-bold text-primary" data-testid="text-total-sevas">{devoteeData?.sevaBookingSummary?.totalSeva || 0}</div>
              <div className="text-xs text-muted-foreground">Total Sevas</div>
              <div className="text-sm font-medium text-primary mt-1" data-testid="text-seva-amount">
                {formatCurrency(devoteeData?.sevaBookingSummary?.totalSevaAmount || 0)}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-none bg-gradient-to-br from-rose-50 to-white" data-testid="card-donation-summary">
            <CardContent className="p-4 text-center">
              <Heart className="h-6 w-6 mx-auto text-secondary mb-2" />
              <div className="text-2xl font-bold text-secondary" data-testid="text-total-donations">{devoteeData?.donationBookingSummary?.totalDonation || 0}</div>
              <div className="text-xs text-muted-foreground">Total Donations</div>
              <div className="text-sm font-medium text-secondary mt-1" data-testid="text-donation-amount">
                {formatCurrency(devoteeData?.donationBookingSummary?.totalDonationAmount || 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for History & Saved Info */}
        <Tabs defaultValue="history" className="w-full" data-testid="tabs-profile">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
            <TabsTrigger value="saved" data-testid="tab-saved">Saved Info</TabsTrigger>
          </TabsList>
          
          <TabsContent value="history" className="space-y-4 mt-4">
            {devoteeLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Past Sevas */}
                <Card data-testid="card-past-sevas">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-serif flex items-center gap-2">
                      <History className="h-4 w-4 text-primary" />
                      Past Sevas ({devoteeData?.pastSevas?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {devoteeData?.pastSevas && devoteeData.pastSevas.length > 0 ? (
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {devoteeData.pastSevas.map((seva, index) => (
                          <div key={seva.id || index} className="flex justify-between items-start py-2 border-b last:border-0" data-testid={`row-seva-${seva.id || index}`}>
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="font-medium text-sm truncate">{seva.sevaName || "Seva"}</div>
                              <div className="text-xs text-muted-foreground">{seva.deityName}</div>
                              <div className="text-xs text-muted-foreground">For: {seva.devoteeName}</div>
                              <div className="text-xs text-muted-foreground">{seva.sevaDate}</div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-medium text-sm text-primary">{formatCurrency(seva.amount || "0")}</div>
                              <div className="text-xs text-muted-foreground">{seva.performedAs}</div>
                              <div className="text-[10px] text-green-600">{seva.performedStatus}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-sevas">No past sevas found</p>
                    )}
                  </CardContent>
                </Card>

                {/* Past Donations */}
                <Card data-testid="card-past-donations">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-serif flex items-center gap-2">
                      <Heart className="h-4 w-4 text-secondary" />
                      Past Donations ({devoteeData?.pastDonations?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {devoteeData?.pastDonations && devoteeData.pastDonations.length > 0 ? (
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {devoteeData.pastDonations.map((donation, index) => (
                          <div key={donation.id || index} className="py-2 border-b last:border-0" data-testid={`row-donation-${donation.id || index}`}>
                            <div className="flex justify-between items-start">
                              <div className="flex-1 min-w-0 pr-2">
                                <div className="font-medium text-sm">{donation.payeeName}</div>
                                <div className="text-xs text-muted-foreground">{donation.donationDate}</div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="font-medium text-sm text-secondary">{formatCurrency(donation.totalAmount || 0)}</div>
                                {donation.requireTaxReceipt === "Yes" && (
                                  <div className="text-[10px] text-blue-600">Tax Receipt</div>
                                )}
                              </div>
                            </div>
                            {donation.details && donation.details.length > 0 && (
                              <div className="mt-2 pl-2 border-l-2 border-secondary/20 space-y-1">
                                {donation.details.map((detail, dIdx) => (
                                  <div key={detail.id || dIdx} className="text-xs text-muted-foreground">
                                    <span className="font-medium text-foreground">{detail.causeName}</span>
                                    <span className="text-secondary ml-1">({detail.categoryName})</span>
                                    <span className="ml-1">- {formatCurrency(detail.donationAmount || 0)}</span>
                                    {detail.donationInTheNameOf && (
                                      <span className="block text-[10px]">In name of: {detail.donationInTheNameOf}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-donations">No past donations found</p>
                    )}
                  </CardContent>
                </Card>

                {/* Past Accommodations */}
                <Card data-testid="card-past-accommodations">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-serif flex items-center gap-2">
                      <Home className="h-4 w-4 text-blue-600" />
                      Past Accommodations ({devoteeData?.pastAccommodations?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {devoteeData?.pastAccommodations && devoteeData.pastAccommodations.length > 0 ? (
                      <div className="space-y-3">
                        {devoteeData.pastAccommodations.map((booking, index) => (
                          <div key={booking.id || index} className="flex justify-between items-center py-2 border-b last:border-0" data-testid={`row-accommodation-${booking.id || index}`}>
                            <div>
                              <div className="font-medium text-sm">{booking.roomType || "Room"}</div>
                              <div className="text-xs text-muted-foreground">
                                {booking.checkIn} - {booking.checkOut}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-sm">{booking.guests || 1} guests</div>
                              <div className="text-xs text-muted-foreground">{booking.status || "Completed"}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-accommodations">No past accommodations found</p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="saved" className="space-y-4 mt-4">
            {devoteeLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Seva Kartas */}
                <Card data-testid="card-seva-kartas">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-serif flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      Seva Kartas ({devoteeData?.kartas?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {devoteeData?.kartas && devoteeData.kartas.length > 0 ? (
                      <div className="space-y-3">
                        {devoteeData.kartas.map((karta, index) => (
                          <div key={karta.id || index} className="py-2 border-b last:border-0" data-testid={`row-karta-${karta.id || index}`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-sm">{karta.name}</div>
                                {karta.nameK && <div className="text-xs text-muted-foreground">{karta.nameK}</div>}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                              {karta.gotra && <div>Gothra: {karta.gotra} {karta.gotraK && `(${karta.gotraK})`}</div>}
                              {karta.nakshatraDisp && <div>Nakshatra: {karta.nakshatraDisp}</div>}
                              {karta.rashiDisp && <div>Rashi: {karta.rashiDisp}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-kartas">No seva kartas saved</p>
                    )}
                  </CardContent>
                </Card>

                {/* Addresses */}
                <Card data-testid="card-addresses">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-serif flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-green-600" />
                      Saved Addresses ({devoteeData?.addresses?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {devoteeData?.addresses && devoteeData.addresses.length > 0 ? (
                      <div className="space-y-3">
                        {devoteeData.addresses.map((address, index) => (
                          <div key={address.id || index} className="py-2 border-b last:border-0" data-testid={`row-address-${address.id || index}`}>
                            <div className="font-medium text-sm">{address.addresseeName || "Address"}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {address.addressLine1}
                              {address.addressLine2 && <>, {address.addressLine2}</>}
                            </div>
                            {address.landmark && (
                              <div className="text-xs text-muted-foreground">Near: {address.landmark}</div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              {[address.city, address.state, address.country, address.pincode]
                                .filter(Boolean)
                                .join(", ")}
                            </div>
                            {address.alternatePhone && (
                              <div className="text-xs text-muted-foreground mt-1">Phone: {address.alternatePhone}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-addresses">No addresses saved</p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Account Actions */}
        <Card className="shadow-sm" data-testid="card-account-actions">
           <CardContent className="p-2">
             <Button variant="ghost" className="w-full justify-start h-12 text-muted-foreground hover:text-foreground" data-testid="button-settings">
               <Settings className="mr-2 h-4 w-4" />
               Settings
             </Button>
             <Button 
                variant="ghost" 
                className="w-full justify-start h-12 text-destructive hover:text-destructive hover:bg-destructive/5"
                onClick={handleLogout}
                data-testid="button-logout"
             >
               <LogOut className="mr-2 h-4 w-4" />
               Sign Out
             </Button>
           </CardContent>
        </Card>
      </div>
    </div>
  );
}
