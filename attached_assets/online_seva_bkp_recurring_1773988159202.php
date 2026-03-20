<?php
$no_login = true;
require_once('config/access.php');
require_once('config/db_config.php');
require_once('util/functions.php');
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <title>Online Seva Page</title>
    <script src="/assets/js/tailwind.min.js"></script>
    <script src="/assets/js/alpine.min.js" defer></script>
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    <!-- noto sans -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap"
        rel="stylesheet">

    <link href="https://fonts.googleapis.com/css?family=Noto Serif" rel="stylesheet" />

    <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
    <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js"></script>
    <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js"></script>

    <script src="config/firebase.config.js"></script>

    <style>
        .text-primary {
            color: #98649D;
        }

        .text-primary-light {
            /* take primary color and have opacity as 50 */
            color: #98649D80;
        }

        .text-secondary {
            color: #834C88;
        }

        .text-secondary-light {
            /* take secondary color and have opacity as 50 */
            color: #834C8880;
        }

        .bg-primary {
            background-color: #98649D;
        }

        .bg-primary-light {
            /* take primary color and have opacity as 50 */
            background-color: #98649D80;
        }

        .bg-secondary {
            background-color: #834C88;
        }

        .bg-secondary-light {
            /* take secondary color and have opacity as 50 */
            background-color: #834C8880;
        }

        .bg-dark {
            background-color: rgb(99, 46, 104);
        }

        .border-primary {
            border-color: #98649D;
        }

        .border-primary-light {
            /* take primary color and have opacity as 50 */
            border-color: #98649D80;
        }

        .border-secondary {
            border-color: rgb(106, 56, 110);
        }

        .font-noto-sans {
            font-family: "Noto sans", sans-serif;
        }

        .font-noto-serif {
            font-family: "Noto serif", sans-serif;
        }

        .no-scroll {
            overflow: hidden;
        }

        .modal-content {
            overflow-y: auto;
            max-height: calc(100vh - 50px);
            padding-right: 15px;
        }
    </style>
</head>

<body class="bg-primary font-noto-sans overflow-x-hidden">
    <div x-data="data()">
        <!-- ui after logging in -->
        <template x-if="isLoggedIn">
            <div class="">
                <div>
                    <div class="flex flex-col lg:flex-row overflow-x-hidden">
                        <!-- Left Section -->
                        <div class="lg:w-[36%] pt-8 lg:pt-16 bg-white text-black">
                            <div class="flex items-center md:justify-center">
                                <img src="./assets/images/onlineSevaLogo.png" alt="Logo" class="lg:w-[60%] w-[50%] ml-12">
                            </div>

                            <!-- sticky cart mobile-->
                            <div class="block lg:hidden absolute top-2 right-2 z-200">
                                <button
                                    class="text-gray-200 bg-dark rounded-xl text-xs relative">
                                    <div @click="showLogout = !showLogout" @click.away="showLogout = false" class="flex items-center justify-between px-2 font-noto-serif italic py-1">
                                        <p class="pl-1">Namaste <br> <span x-text="user.name"></span></p>
                                        <span class="material-icons" x-text="showLogout ? 'keyboard_arrow_up' : 'keyboard_arrow_down'"></span>
                                    </div>

                                    <div x-show="showLogout" x-transition
                                        class="bg-primary py-1 text-center" :class="selectedSevaType?.hasCart && selectedSevas?.length ? '' : 'rounded-b-xl'">
                                        <a href="/logout"
                                            class="flex items-center justify-center justify-center px-4 py-1 text-white">
                                            Logout <span class="material-icons text-xs ml-1">power_settings_new</span>
                                        </a>
                                    </div>

                                    <p x-show="selectedSevaType?.hasCart && selectedSevas?.length" @click="isCartOpen = true" class="text-center text-[8px] md:text-[10px] lg:text-[12px] font-noto-sans bg-primary-light py-1 rounded-b-xl px-2" x-show="donationForm.selectedDonations?.length">
                                        <span class="" x-text="selectedSevas ? selectedSevas.length : 0"></span>
                                        Seva(s) Added
                                    </p>
                                </button>
                            </div>

                            <!-- Menu Section (For md+ devices) -->
                            <div class="hidden lg:block pl-2 pt-6 lg:pl-52 lg:pt-24">
                                <!-- Loop through menu items dynamically -->
                                <template x-for="(menuItem, idx) in menuItems" :key="menuItem.id">
                                    <a :href="menuItem.link" x-show="menuItem.id !== 'viewProfile' || (menuItem.id === 'viewProfile' && !user.isAnonymous)" class="cursor-pointer transition-all duration-300 text-xl">
                                        <div class="flex items-center" :class="menuItem.id === 'bookSeva' ? 'italic text-primary font-bold' : 'w-3/4 text-primary-light'">
                                            <span class="font-noto-serif">
                                                <span x-text="menuItem.name"></span>
                                            </span>
                                            <span class="material-icons ml-20" x-show="menuItem.id === 'bookSeva'">arrow_forward</span>
                                        </div>
                                        <div class="border-b-2 my-6" x-show="(user?.isAnonymous && idx < 2) || (!user?.isAnonymous && idx < 3)"
                                            :class="menuItem.id === 'bookSeva' ? 'border-primary' : 'border-primary-light w-[65%]'"></div>
                                    </a>
                                </template>
                            </div>


                            <!-- Menu Section (For Mobile Screens Only) -->
                            <div class="relative block lg:hidden w-full px-4 mt-4" x-data="{ centerActiveNav() {
                                $nextTick(() => {
                                let activeTab = $refs.navContainer.querySelector('.active-nav');
                                if (activeTab) {
                                let container = $refs.navContainer;
                                let scrollLeft = activeTab.offsetLeft - (container.offsetWidth / 2) + (activeTab.offsetWidth / 2);
                                container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
                                }
                                });
                            }}">

                                <!-- Left Fade Effect -->
                                <div class="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white via-white to-transparent pointer-events-none"></div>

                                <!-- Scrollable Nav Container for mobile menu -->
                                <div x-ref="navContainer" class="bg-primary-light flex overflow-x-auto no-scrollbar whitespace-nowrap space-x-6 items-center justify-start px-8 py-1 shadow-md rounded-lg" x-init="centerActiveNav()">
                                    <template x-for="menuItem in menuItems" :key="menuItem.id">
                                        <div x-show="menuItem.id !== 'viewProfile' || (menuItem.id === 'viewProfile' && !user.isAnonymous)" @click="centerActiveNav();"
                                            class="cursor-pointer text-lg flex-shrink-0 transition-all px-4 md:px-8 py-3 md:py-4 rounded-lg"
                                            :class="menuItem.id === 'bookSeva' ? 'active-nav text-primary font-semibold italic bg-white' : 'text-primary-light'">

                                            <a :href="menuItem.link" class="flex items-center">
                                                <span class="font-noto-serif">
                                                    <span x-text="menuItem.name"></span>
                                                </span>
                                            </a>
                                        </div>
                                    </template>
                                </div>

                                <!-- Right Fade Effect -->
                                <div class="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white via-white to-transparent pointer-events-none"></div>
                            </div>

                            <!-- Scrollable Mobile Nav -->
                            <div class="relative block lg:hidden w-full px-4 mt-4" x-data="{ centerActiveNav() {
                                $nextTick(() => {
                                let activeTab = $refs.navContainer.querySelector('.active-nav');
                                if (activeTab) {
                                 let container = $refs.navContainer;
                                let scrollLeft = activeTab.offsetLeft - (container.offsetWidth / 2) + (activeTab.offsetWidth / 2);
                                container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
                                }
                                });
                                }}">

                                <!-- Left Fade Effect -->
                                <div
                                    class="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white via-white to-transparent pointer-events-none">
                                </div>
                                <!-- Scrollable Nav Container -->
                                <div x-ref="navContainer"
                                    class="flex overflow-x-auto no-scrollbar whitespace-nowrap space-x-6 items-center justify-start px-8 py-2 bg-white shadow-md rounded-lg"
                                    x-init="centerActiveNav()">
                                    <template x-for="sevaType in sevaTypes" :key="sevaType.id">
                                        <div x-show="sevaType.isAllowed" @click="selectSevaType(sevaType); centerActiveNav();"
                                            class="cursor-pointer text-lg py-1 flex-shrink-0 transition-all px-4 md:px-8"
                                            :class="selectedSevaType?.id == sevaType.id ? 'active-nav text-primary font-semibold italic' : 'text-primary-light'">
                                            <span x-text="sevaType.name"></span>
                                        </div>
                                    </template>
                                </div>
                                <!-- Right Fade Effect -->
                                <div
                                    class="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white via-white to-transparent pointer-events-none">
                                </div>
                            </div>
                        </div>

                        <!-- Right Section -->
                        <div class="lg:w-[64%] bg-primary min-h-screen">
                            <!-- sticky cart -->
                            <div class="relative lg:h-60 h-20">
                                <!-- Cart Icon -->
                                <div class="hidden lg:block absolute top-5 lg:top-24 right-4 lg:right-24 lg:right-24 z-200">
                                    <button
                                        class="text-gray-200 bg-dark rounded-xl text-xs relative">
                                        <div @click="showLogout = !showLogout" @click.away="showLogout = false" class="flex items-center justify-between px-2 font-noto-serif italic py-2">
                                            <p class="pl-1">Namaste <br> <span x-text="user.name"></span></p>
                                            <span class="material-icons" x-text="showLogout ? 'keyboard_arrow_up' : 'keyboard_arrow_down'"></span>
                                        </div>

                                        <div x-show="showLogout" x-transition
                                            class="bg-white py-1 text-center" :class="selectedSevaType?.hasCart && selectedSevas?.length ? '' : 'rounded-b-xl'">
                                            <a href="/logout"
                                                class="flex items-center justify-center justify-center px-4 py-2 text-primary">
                                                Logout <span class="material-icons text-sm ml-1">power_settings_new</span>
                                            </a>
                                        </div>

                                        <p x-show="selectedSevaType?.hasCart && selectedSevas?.length" @click="isCartOpen = true" class="text-center text-[8px] lg:text-[12px] font-noto-sans bg-primary-light py-2 rounded-b-xl px-2">
                                            <span x-text="selectedSevas ? selectedSevas.length : 0 "></span>
                                            Seva(s) Added
                                        </p>
                                        <div class="absolute bg-white rounded-full h-6 w-6 -top-2 -left-2"></div>
                                    </button>
                                </div>
                                <!-- Cart Modal -->
                                <div x-show="isCartOpen"
                                    @click.away="isCartOpen = false; document.body.classList.remove('no-scroll')"
                                    x-init="$watch('isCartOpen', value => value ? document.body.classList.add('no-scroll') : document.body.classList.remove('no-scroll'))"
                                    class="fixed inset-0 z-50 overflow-hidden" x-cloak>
                                    <!-- overlay -->
                                    <div class="inset-0 fixed bg-black/20 backdrop-blur-sm"></div>
                                    <!-- Modal -->
                                    <div class="fixed inset-0 lg:w-[60%] lg:mx-auto pt-32 overflow-hidden">
                                        <div
                                            class="bg-white mx-2 lg:ml-4 lg:mr-0 rounded-2xl shadow-xl relative text-primary modal-content">
                                            <button @click="isCartOpen = false"
                                                class="absolute text-3xl top-5 right-7 text-primary">
                                                &times;
                                            </button>
                                            <h2 class="text-2xl font-noto-serif italic font-semibold text-center pt-16">
                                                Added Seva Bookings</h2>
                                            <div class="lg:px-20">
                                                <template x-if="selectedSevas.length === 0">
                                                    <p class="text-gray- text-center mt-6">Please Select a Seva First.
                                                    </p>
                                                </template>
                                                <div class="my-12 mx-4 lg:mx-8">
                                                    <template x-for="(seva, index) in selectedSevas" :key="index">
                                                        <div class="pt-8">
                                                            <div class="flex items-center justify-between">
                                                                <div class="flex space-x-2">
                                                                    <div class="rounded-full bg-primary-light text-white w-9 h-9 flex items-center justify-center font-semibold"
                                                                        x-text="index +1"></div>
                                                                    <div class="flex flex-col text-sm pl-4">
                                                                        <div class="text-left">
                                                                            <p class="font-semibold"
                                                                                x-text="seva.sannidhiName">
                                                                            </p>
                                                                            <p> <span
                                                                                    x-text="`${seva.deitySevaName} - ₹ `"></span>
                                                                                <span
                                                                                    x-text="formatNumber(seva.amount)"></span>
                                                                            </p>
                                                                            <p x-show="seva.postageCharges">
                                                                                <span x-text="`Postage - ₹ `"></span>
                                                                                <span
                                                                                    x-text="formatNumber(seva.postageCharges)"></span>
                                                                            </p>
                                                                            <p>
                                                                                <span class="italic">Karta</span>:
                                                                                <span x-text="seva.name"></span>
                                                                                <span
                                                                                    x-show="selectedSevaType?.id === 2"
                                                                                    x-text=" ' - ' + (seva.inAbsentia == 1 ? '(In Absentia)' : '(In Person)')"></span>
                                                                            </p>
                                                                        </div>
                                                                        <template x-if="selectedSevaType?.id === 2">
                                                                            <p class="mt-4 text-left"
                                                                                x-text="formatDate(seva.sevaDate)"></p>
                                                                        </template>
                                                                        <template x-if="selectedSevaType?.id === 3">
                                                                            <p class="mt-4 text-left">
                                                                                <span
                                                                                    x-text="`${formatDate(seva.fromDate)} - `"></span>
                                                                                <span
                                                                                    x-text="seva.noEnd ? 'Lifetime' : formatDate(seva.toDate)"></span>
                                                                            </p>
                                                                        </template>
                                                                    </div>
                                                                </div>
                                                                <div class="flex flex-col text-md items-between">
                                                                    <p class="font-noto-serif text-xl text-right font-semibold">
                                                                        <span x-text="`₹ `"></span>
                                                                        <span x-text="formatNumber(seva.totalAmount)"></span>
                                                                    </p>
                                                                    <p @click="editSevaClick(seva, index)" class="border border-primary rounded-md text-xs px-2 py-1 bg-white cursor-pointer mt-4" x-show="selectedSevaType?.id === 2">Edit Seva</p>
                                                                    <button
                                                                        class="mt-10 uppercase bg-white text-primary border border-primary rounded-md text-sm px-4 py-1"
                                                                        @click="removeSeva(index)">Remove</button>
                                                                </div>
                                                            </div>
                                                            <div class="border-b border-primary mt-6"></div>
                                                        </div>
                                                    </template>
                                                    <div class="flex justify-between space-x-4 lg:space-x-0 mt-16">
                                                        <button
                                                            class="mb-16 rounded-md py-2 lg:py-6 text-lg text-primary bg-white border border-primary lg:w-[42%]"
                                                            @click="isCartOpen = false; currentStep = 1; hideCalendarPostageChaturmasya = false">
                                                            + Add Another Seva</button>
                                                        <button
                                                            class="mb-16 rounded-md py-2 lg:py-6 text-lg text-white bg-primary lg:w-[42%]"
                                                            @click="showPayeeModal()">Proceed to
                                                            pay ₹ <span x-text="formatNumber(totalSevaAmount)"></span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div x-show="home" class="lg:ml-20 lg:mr-32 md:mx-12">
                                <div class="text-white p-4">
                                    <div class="md:mr-12x">
                                        <!-- seva Selector homepage-->
                                        <div class="mb-8">
                                            <label for="selectedFrequentSeva" class="">Quick Select Seva</label>
                                            <select x-model="selectedFrequentSevaId" class="py-3 text-sm w-full rounded text-primary appearance-none outline-[#98649D] 
                                                    focus:ring-1 focus:ring-[#98649D] focus:border-transparent
                                                    hover:border-[#98649D] text-primary  border-none"
                                                id="selectedFrequentSeva" @change="setFrequentSeva()">
                                                <option value="">Upcoming sevas</option>
                                                <template x-for="frequentSeva in frequentSevas">
                                                    <option class="" :value="frequentSeva.dsId"
                                                        x-text="`${frequentSeva.deityName} - ${frequentSeva.sevaName}`"
                                                        :selected="frequentSeva.dsId == selectedFrequentSevaId">
                                                    </option>
                                                </template>
                                            </select>
                                        </div>
                                        <h1 class="text-center text-lg font-semibold font-noto-serif mt-8 md:my-6">Choose a Seva Type</h1>
                                        <div class="grid grid-cols-1 md:grid-cols-2 md:gap-16 mb-16">
                                            <template x-for="sevaType in sevaTypes" :key="sevaType.id">
                                                <div x-show="sevaType.isAllowed" class="rounded-lg mt-4 h-52x shadow-md bg-cover bg-center relative">
                                                    <!-- :style="'background-image: url(' + getBgImage(donationHeading.id) + ');'" -->
                                                    <!-- Gradient Overlay -->
                                                    <div class="absolute inset-0 bg-white opacity-80 rounded-lg"></div>

                                                    <div class="relative flex flex-col justify-between h-full p-6">

                                                        <div class="">
                                                            <div class="flex w-full justify-between">
                                                                <h3 class="text-primary font-semibold italic text-xl font-noto-serif w-full z-10 text-left w-2/3" x-text="sevaType.name"></h3>
                                                            </div>

                                                            <p class="text-primary text-sm md:text-base font-bold font-noto-serif mt-2 w-full z-10 text-left w-full" x-text="sevaType.description"></p>
                                                        </div>

                                                        <div class="flex flex-col items-start z-10 mt-12">
                                                            <button @click="selectSevaType(sevaType)"
                                                                class="bg-primary text-white px-4 py-2 rounded-xl">Pick this seva
                                                                <span class="material-icons text-sm ml-2">arrow_forward</span>
                                                            </button>
                                                        </div>

                                                    </div>
                                                </div>
                                            </template>
                                        </div>
                                    </div>

                                </div>
                            </div>
                            <div x-show="!home">
                                <!-- Laptop UI for Nav Links -->
                                <div class="hidden lg:block ml-28 mr-40 mt-8 mb-12">
                                    <div class="flex items-center">
                                        <template x-for="sevaType in sevaTypes" :key="sevaType.id">
                                            <button x-show="sevaType.isAllowed" @click="selectSevaType(sevaType)"
                                                class="transition-all duration-300 text-xs uppercase py-3 px-12 font-semibold"
                                                :class="selectedSevaType?.id == sevaType.id ? 'border border-transparent bg-white text-primary roundedx' : 'text-primary bg-dark border border-secondary'">
                                                <div class="flex items-center px-3">
                                                    <span x-text="sevaType.name" class=""></span>
                                                </div>
                                            </button>
                                        </template>
                                    </div>
                                </div>
                                <!-- Navigation till here -->


                                <!-- Fastline Screen -->
                                <div x-show="selectedSevaType?.id === 1" class="lg:ml-24 md:mx-12 lg:mr-44 mt-12">
                                    <template x-if="!sevaPaid">
                                        <div>
                                            <!-- Seva Form -->
                                            <div class="px-4">
                                                <div
                                                    class="bg-white mb-16 min-h-screen px-4 py-8 md:px-12 lg:px-20 lg:py-12 rounded-lg shadow-md">
                                                    <div class="flex flex-col">
                                                        <button
                                                            class="text-right w-full text-sm text-primary underline hidden"
                                                            @click="showKartaListFL = !showKartaListFL">+ Pick karta from
                                                            list
                                                        </button>
                                                        <div class="w-full text-sm p-4 rounded-lg shadow-lg"
                                                            x-show="showKartaListFL" @click.away="showKartaListFL = false">
                                                            <h2 class="text-lg font-semibold mb-2 ml-2">Kartas</h2>
                                                            <template x-for="kartaRef in user.kartas">
                                                                <button
                                                                    class="flex items-start space-x-2 cursor-pointer w-full hover:bg-[#98649D]/50 p-2 rounded-lg"
                                                                    @click="selectKartaFL(kartaRef)">
                                                                    <span class="w-1/3 text-left font-semibold"
                                                                        x-text="kartaRef.name"></span>
                                                                    <span class="w-1/3 text-left"
                                                                        x-text="kartaRef.nakshatraDisp"></span>
                                                                    <span class="w-1/3 text-left"
                                                                        x-text="kartaRef.rashiDisp"></span>
                                                                </button>
                                                            </template>
                                                        </div>
                                                        <div class="">
                                                            <label for="fastlineKartaName" class=""></label>
                                                            <input type="text" id="fastlineKartaName"
                                                                placeholder="Karta's Name" x-model="newPayee.name" @click.away="xt(newPayee, 'name', 'nameK')"
                                                                @blur="xt(newPayee, 'name', 'nameK')"
                                                                class="my-4 lg:my-0 text-sm placeholder:italic placeholder:text-primary-light text-primary w-full border-l-0 border-r-0 border-t-0 border-primary border-b focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-[#98649D] text-primary px-1 py-2 ml-1">
                                                            <span class="ml-2 text-sm text-primary"
                                                                x-text="newPayee.nameK"></span>
                                                        </div>

                                                        <div class="lg:mt-8">
                                                            <label for="mobile" class=""></label>
                                                            <input type="text" placeholder="Karta's Mobile Number"
                                                                x-model="newPayee.mobile"
                                                                class="my-4 lg:my-0 text-sm placeholder:italic placeholder:text-primary-light w-full border-l-0 border-r-0 border-t-0 border-primary border-b  focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-[#98649D] text-primary px-1 py-2 ml-1">
                                                        </div>
                                                        <div class="lg:mt-8">
                                                            <label for="city" class=""></label>
                                                            <input type="text" id="city" placeholder="Karta's City"
                                                                x-model="newPayee.city" @click.away="xt(newPayee, 'city', 'cityK')"
                                                                @blur="xt(newPayee, 'city', 'cityK')"
                                                                class="my-4 lg:my-0 text-sm placeholder:italic placeholder:text-primary-light w-full border-l-0 border-r-0 border-t-0 border-primary border-b focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-[#98649D] text-primary px-1 py-2 ml-1">
                                                            <span class="ml-2 text-sm text-primary"
                                                                x-text="newPayee.cityK"></span>
                                                        </div>

                                                        <div class="text-primary lg:mt-10 my-6">
                                                            <p class="text-sm ml-1 my-2">Choose a Location</p>
                                                            <div
                                                                class="font-semibold ml-1 text-center font-noto-sans lg:mt-2">
                                                                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                                                    <template x-for="centre in centres" :key="centre.id">
                                                                        <button
                                                                            class="hover:bg-[#98649D] hover:text-white  border border-primary rounded-md py-4 leading-tight lg:min-w-32"
                                                                            @click="selectDeity(centre)"
                                                                            :class="selectedDeity === centre ? 'bg-primary text-white' : 'text-primary'"
                                                                            x-html="centre.name">
                                                                        </button>
                                                                    </template>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div x-show="showFastlineSevas && selectedDeity?.id !== 1">
                                                            <div class="lg:mt-10">
                                                                <label for="fastlineNakshatra" class=""></label>
                                                                <select x-model="newPayee.nakshatraId"
                                                                    id="fastlineNakshatra"
                                                                    @change="getRashis(newPayee.nakshatraId, 'newPayee')"
                                                                    class="text-sm text-left w-full border-0 text-primary appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-[#98649D] px-1">
                                                                    <option value="">Select a Nakshatra</option>
                                                                    <template x-for="nakshatra in nakshatras"
                                                                        :key="nakshatra.id">
                                                                        <option :value="nakshatra.id"
                                                                            x-text="nakshatra.name"
                                                                            :selected="nakshatra.id == newSeva.nakshatraId">
                                                                        </option>
                                                                    </template>
                                                                </select>
                                                                <div class="ml-1 border-b border-primary mr-2"></div>
                                                            </div>

                                                            <!-- Fastline Rashi -->
                                                            <div class="lg:mt-10">
                                                                <label for="fastlineRashi" class=""></label>
                                                                <select x-model="newPayee.rashiId" id="fastlineRashi"
                                                                    class="text-sm text-left w-full border-0 text-primary appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-[#98649D] text-primary px-1">
                                                                    <option value="">Select a Rashi</option>
                                                                    <template
                                                                        x-for="rashi in dispRashisMap['newPayee'] || []"
                                                                        :key="rashi.id">
                                                                        <option :value="rashi.id" x-text="rashi.name"
                                                                            :selected="rashi.id == newSeva.rashiId">
                                                                        </option>
                                                                    </template>
                                                                </select>
                                                                <div class="ml-1 border-b border-primary mr-2 mb-6"></div>
                                                            </div>
                                                        </div>
                                                        <div x-show="selectedDeity?.id === 1">
                                                            <div class="flex flex-col lg:flex-row justify-between text-primary text-sm ml-1 mt-2 lg:mt-10"
                                                                x-show="showField('inAbsentia')">
                                                                <div><label class="text-primary-light">Seva Performed</label>
                                                                </div>
                                                                <div class="flex mt-4 lg:mt-0 lg:space-x-4">
                                                                    <label class="mr-1 lg:mr-8 flex items-center space-x-2">
                                                                        <input type="radio" x-model="newPayee.inAbsentia"
                                                                            value="1"
                                                                            class=" w-3 h-3 text-primary bg-white border-primary-light focus:ring-[#98649D] focus:outline-none checked:bg-[#98649D] checked:border-[#98649D]">
                                                                        <span class="font-noto-sans">In Absentia</span>
                                                                    </label>
                                                                    <label class="flex items-center space-x-2 ml-8">
                                                                        <input type="radio" x-model="newPayee.inAbsentia"
                                                                            value="0"
                                                                            class=" w-3 h-3 text-primary bg-white border-primary-light focus:ring-[#98649D] focus:outline-none checked:bg-[#98649D] checked:border-[#98649D]">
                                                                        <span class="font-noto-sans">In Person</span>
                                                                    </label>
                                                                </div>
                                                            </div>
                                                            <div class="ml-1 border-b border-primary my-1"></div>
                                                            <p x-show="newPayee.inAbsentia == 1"
                                                                class="text-red-500 m-1 text-sm">
                                                                Seva
                                                                will be performed but Prasadam will not be sent.
                                                            </p>
                                                        </div>
                                                        <template x-if="showFastlineSevas">
                                                            <div class="text-primary ml-1 font-noto-sans mt-4 lg:mt-10">
                                                                <p class="text-sm">Select <span class="italic"
                                                                        x-show="false">one</span> seva</p>
                                                                <div class="mx-6">
                                                                    <template x-for="seva in sevas" :key="seva.id">
                                                                        <div x-ref="seva.inAbsentia == newPayee.inAbsentia"
                                                                            class="text-sm">
                                                                            <div
                                                                                class="flex justify-between items-center py-2">
                                                                                <div class="flex items-center">
                                                                                    <input type="checkbox"
                                                                                        :checked="seva.selected"
                                                                                        @click="toggleSeva(seva); addFastlineSeva(seva, $event)"
                                                                                        class="mr-2 accent-[#98649D] checked:bg-[#98649D] checked:border-[#98649D] gs" />
                                                                                    <label x-text="seva.name"
                                                                                        class="mr-4"></label>
                                                                                </div>
                                                                                <template x-if="seva.isFixedPrice">
                                                                                    <span x-text="`₹${seva.price}`"></span>
                                                                                </template>
                                                                                <template x-if="!seva.isFixedPrice">
                                                                                    <input type="number"
                                                                                        x-model="seva.price"
                                                                                        @keyup="addFastlineSeva(seva, $event)"
                                                                                        @focus="seva.price = ''"
                                                                                        class="border border-primary rounded-md text-right p-1 w-[80px]" />
                                                                                </template>
                                                                            </div>
                                                                            <div class="border-b border-primary my-2">
                                                                            </div>
                                                                        </div>
                                                                    </template>
                                                                    <!-- Total Amount -->
                                                                    <div class="mt-4 text-md font-semibold text-right">
                                                                        Total amount <span x-text="`₹${totalAmount}`"
                                                                            class="ml-12"></span>
                                                                    </div>
                                                                </div>
                                                                <!-- Validation Messages -->
                                                                <div x-show="validationMessages.length"
                                                                    class="text-red-500 text-sm text-center mt-8">
                                                                    <template x-for="message in validationMessages"
                                                                        :key="message">
                                                                        <p x-text="message"></p>
                                                                    </template>
                                                                </div>
                                                                <!-- Payment Button -->
                                                                <div class="flex justify-center items-center mt-12">
                                                                    <button
                                                                        class="uppercase font-noto-sans rounded-md bg-dark text-white w-2/3 md:w-1/3 lg:w-2/5 py-3"
                                                                        @click="validateAndSubmit()">Make payment
                                                                        <span
                                                                            class="material-icons text-[16px] ml-6">arrow_forward</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </template>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </template>
                                </div>
                                <!-- Payee Modal -->
                                <div x-show="payeeModal && selectedSevas.length > 0"
                                    @click.away="payeeModal = false; document.body.classList.remove('no-scroll')"
                                    x-init="$watch('payeeModal', value =>  value ? document.body.classList.add('no-scroll') : document.body.classList.remove('no-scroll'))"
                                    class="fixed inset-0 z-10 overflow-hidden" x-cloak>
                                    <!-- overlay -->
                                    <div class="inset-0 fixed bg-black/20 backdrop-blur-sm"></div>
                                    <!-- modal -->
                                    <div class="fixed inset-0 lg:w-[60%] lg:mx-auto overflow-hidden">
                                        <div class="relative bg-white py-12 rounded-lg shadow-md mb-16 px-4 lg:px-20 mt-20 lg:mt-24 lg:ml-80 mx-4"
                                            @click.away="payeeModal = false">
                                            <div class="absolute right-4 top-4 lg:right-8 lg:top-8 "><button
                                                    @click="payeeModal = false" class="text-2xl">&times;</button></div>
                                            <div class="font-noto-serif">
                                                <h2 class="text-primary font-noto-sans text-center font-semibold text-xl">
                                                    Payee Details</h2>
                                                <div class="mt-5">
                                                    <input type="text" x-model="newSeva.name" placeholder="Name"
                                                        class="text-sm placeholder:text-primary-light text-primary w-full border-l-0 border-r-0 border-t-0 border-b border-primary py-2 px-1 ml-1 mr-2 outline-none focus:outline-none appearance-none focus:ring-1 focus:ring-[#98649D] focus:border-0 focus:border-primary"
                                                        required>
                                                </div>
                                                <div class="mt-3">
                                                    <label for="city" class=""></label>
                                                    <input type="text" id="city" x-model="newSeva.addresseePlace"
                                                        placeholder="City"
                                                        class="text-sm placeholder:text-primary-light text-primary w-full border-l-0 border-r-0 border-t-0 border-b border-primary py-2 px-1 ml-1 mr-2 outline-none focus:outline-none appearance-none focus:ring-1 focus:ring-[#98649D] focus:border-0 focus:border-primary"
                                                        required>
                                                </div>
                                                <div class="mt-3">
                                                    <label for="email"></label>
                                                    <input type="email" id="email" x-model="newSeva.email"
                                                        placeholder="Email"
                                                        class="text-sm placeholder:text-primary-light text-primary w-full border-l-0 border-r-0 border-t-0 border-b border-primary py-2 px-1 ml-1 mr-2 outline-none focus:outline-none appearance-none focus:ring-1 focus:ring-[#98649D] focus:border-0 focus:border-primary"
                                                        required>
                                                </div>
                                                <div class="relative mt-8">
                                                    <select x-model="newSeva.countryCode" class="py-2 text-sm w-full rounded text-primary appearance-none outline-[#98649D] 
                                         focus:ring-1 focus:ring-[#98649D] focus:border-transparent
                                         hover:border-[#98649D] text-primary">
                                                        <option value="">Select country code</option>
                                                        <template x-for="code in countryCodes" :key="code.code">
                                                            <option :value="code.dial_code"
                                                                :selected="newSeva.countryCode == code.dial_code"
                                                                x-text="code.name + ' (' + code.dial_code + ')'"></option>
                                                        </template>
                                                    </select>
                                                </div>
                                                <div class="mt-1">
                                                    <label for="mobile"></label>
                                                    <input type="text" id="mobile" x-model="newSeva.addresseeMobile"
                                                        placeholder="Mobile"
                                                        class="text-sm placeholder:text-primary-light text-primary w-full border-l-0 border-r-0 border-t-0 border-b border-primary py-2 px-1 ml-1 mr-2 outline-none focus:outline-none appearance-none focus:ring-1 focus:ring-[#98649D] focus:border-0 focus:border-primary"
                                                        required>
                                                </div>
                                                <!-- Validation Messages -->
                                                <div x-show="validationMessages?.length > 0"
                                                    class="text-red-500 text-sm text-center my-4">
                                                    <template x-for="message in validationMessages"
                                                        :key="message">
                                                        <p x-text="message"></p>
                                                    </template>
                                                </div>

                                                <div class="flex justify-center items-center mt-8 mb-2 font-noto-sans gap-6 lg:mt-12">
                                                    <button @click="clearPayeeModal()" class="px-4 py-2 bg-gray-200 text-primary font-medium rounded-md">Clear Fields</button>
                                                    <button @click="submitSevas()"
                                                        class="mr-12 lg:mr-2 bg-dark text-md text-white uppercase py-2 pr-4 pl-8 rounded-md flex items-center">
                                                        Submit
                                                        <span class="ml-4 material-icons text-sm"></span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <!-- OTFS and PS Screen -->
                                <div x-show="selectedSevaType?.id === 2 || selectedSevaType?.id === 3"
                                    class="lg:ml-24 lg:mr-44 md:mx-12 mt-20">
                                    <template x-if="!sevaPaid">
                                        <div>
                                            <!-- Seva Form -->
                                            <div x-show="currentStep <= 3" class="pl-4 pr-4 pb-2">
                                                <!-- Dynamic form Content Container -->
                                                <div class="bg-white px-4 md:px-12 lg:px-20 py-14 rounded-lg shadow-md mb-16">
                                                    <!-- seva selection page -->
                                                    <template x-if="currentStep === 1">
                                                        <div class="font-noto-serif">
                                                            <!-- seva Selector -->
                                                            <div class="mb-8" x-show="showField('frequentSevas')">
                                                                <label for="selectedFrequentSeva" class=""></label>
                                                                <select x-model="selectedFrequentSevaId" class="py-3 text-sm w-full rounded text-primary appearance-none outline-[#98649D] 
                                                    focus:ring-1 focus:ring-[#98649D] focus:border-transparent
                                                    hover:border-[#98649D] text-primary bg-primary-light border-none"
                                                                    id="selectedFrequentSeva" @change="setFrequentSeva()">
                                                                    <option value="">Upcoming event sevas</option>
                                                                    <template x-for="frequentSeva in frequentSevas">
                                                                        <option class="" :value="frequentSeva.dsId"
                                                                            x-text="`${frequentSeva.deityName} - ${frequentSeva.sevaName}`"
                                                                            :selected="frequentSeva.dsId == selectedFrequentSevaId">
                                                                        </option>
                                                                    </template>
                                                                </select>
                                                            </div>
                                                            <div class="text-xs italic text-secondary mb-6" x-show="selectedSevaType?.id ===3">
                                                                <ul> <!-- style="list-style-type:disc;" -->
                                                                    <li>* The amount calculation for long term sevas for daily & weekly are approximated to calendar days.</li>
                                                                    <li>* Chandramana and Souramana sevas are accepted upto officially released panchanagam dates</li>
                                                                </ul>
                                                            </div>
                                                            <!-- sannidhi selection section -->
                                                            <div class="text-sm" x-show="showField('sannidhiId')">
                                                                <label for="sannidhiId" class=""></label>
                                                                <div class="relative">
                                                                    <input type="text" x-model="searchSannidhi"
                                                                        class="text-sm text-left w-4/5 border-0 text-primary placeholder:text-primary appearance-none outline-none focus:ring-0 focus:border-0 hover:border-[#98649D] text-primary px-1 pr-8"
                                                                        placeholder="Select a Sannidhi"
                                                                        @click.away="showSannidhiDropdown = false"
                                                                        @focus="searchSannidhi = ''; filteredSevas = sevas; showSannidhiDropdown = true;"
                                                                        @input="filterSannidhis()" />
                                                                    <div class="absolute right-0 top-1/2 transform -translate-y-1/2 px-2 text-primary">
                                                                        <span class="material-icons" x-text="showSannidhiDropdown ? 'expand_less' : 'expand_more'"></span>
                                                                    </div>
                                                                    <div class="absolute left-0 w-full overflow-y-scroll h-80 bg-white border border-primary mt-2 z-30"
                                                                        x-show="showSannidhiDropdown && filteredSannidhis.length > 0"
                                                                        x-cloak>
                                                                        <template x-for="sannidhi in filteredSannidhis"
                                                                            :key="sannidhi.id">
                                                                            <div class="cursor-pointer text-primary px-2 py-1 hover:bg-[#F1E0F0]"
                                                                                @click="selectSannidhi(sannidhi.id)">
                                                                                <span x-text="sannidhi.name"></span>
                                                                            </div>
                                                                        </template>
                                                                    </div>
                                                                </div>
                                                                <div class="ml-1 border-b border-primary"></div>
                                                            </div>

                                                            <!-- Seva Selection Section -->
                                                            <div class="mt-8" x-show="showField('deitySevaId')">
                                                                <label for="sevaId" class=""></label>
                                                                <div class="relative">
                                                                    <input type="text" x-model="searchSeva"
                                                                        class="text-sm text-left w-4/5 border-0 text-primary placeholder:text-primary appearance-none outline-none focus:ring-0 focus:border-0 hover:border-[#98649D] text-primary px-1 pr-8"
                                                                        placeholder="Select a Seva"
                                                                        @click.away="showSevaDropdown = false"
                                                                        @focus="searchSeva = ''; showSevaDropdown = true; filterSevas();"
                                                                        @input="filterSevas()" />
                                                                    <div class="absolute right-0 top-1/2 transform -translate-y-1/2 px-2 text-primary">
                                                                        <span class="material-icons" x-text="showSevaDropdown ? 'expand_less' : 'expand_more'"></span>
                                                                    </div>
                                                                    <div class="absolute left-0 w-full overflow-y-scroll h-80 bg-white border border-primary mt-2 text-sm z-30"
                                                                        x-show="showSevaDropdown && filteredSevas.length > 0"
                                                                        x-cloak>
                                                                        <template x-for="seva in filteredSevas" :key="seva.id">
                                                                            <div class="cursor-pointer text-primary px-2 py-1 hover:bg-[#F1E0F0]"
                                                                                @click="selectSeva(seva.id)">
                                                                                <span x-text="seva.name + ' - ₹' + seva.price"></span>
                                                                            </div>
                                                                        </template>
                                                                    </div>
                                                                    <div class="ml-1 border-b border-primary"></div>
                                                                </div>
                                                            </div>
                                                            <div x-show="hideCalendarPostageChaturmasya == true">
                                                                <p class="text-primary mt-4 italic text-sm">* The Seva is performed during applicable days in Chaturmasya starting 10th July 2025</p>
                                                            </div>
                                                            <!-- Seva Date Section -->
                                                            <!-- Calendar -->
                                                            <div x-show="newSeva.dsId && hideCalendarPostageChaturmasya == false">
                                                                <div class="mt-8 text-white" x-show="showField('sevaDate')">
                                                                    <h2 class="text-sm mb-2 ml-2 text-primary">Select a seva date</h2>

                                                                    <div class="flex flex-col md:flex-row mt-4 overflow-x-scroll px-4">
                                                                        <template x-for="(month, index) in calendarMonths" :key="index">
                                                                            <div class="p-3 bg-dark rounded-lg shadow-md mb-4 md:mr-4 flex-none">
                                                                                <div class="text-center uppercase my-4 mt-2 mb-2" x-text="month.name"></div>

                                                                                <div class="grid grid-cols-7 gap-1 mt-2 font-noto-serif">
                                                                                    <div class="text-xs font-thin text-center">Sun</div>
                                                                                    <div class="text-xs font-thin text-center">Mon</div>
                                                                                    <div class="text-xs font-thin text-center">Tue</div>
                                                                                    <div class="text-xs font-thin text-center">Wed</div>
                                                                                    <div class="text-xs font-thin text-center">Thu</div>
                                                                                    <div class="text-xs font-thin text-center">Fri</div>
                                                                                    <div class="text-xs font-thin text-center">Sat</div>

                                                                                    <template x-for="(day, dayIndex) in month.days" :key="dayIndex">
                                                                                        <div :class="getClass(day)"
                                                                                            x-text="day.date"
                                                                                            class="text-center py-2 px-4 text-center rounded text-xs cursor-pointer"
                                                                                            @click="selectSevaDate(day)">
                                                                                        </div>
                                                                                    </template>
                                                                                </div>
                                                                            </div>
                                                                        </template>
                                                                    </div>

                                                                    <!-- Date Legends -->
                                                                    <div class="grid grid-cols-2 gap-1 md:flex space-x-4 text-xs mt-4 mb-12 px-4">
                                                                        <div class="text-center rounded ml-4 md:ml-0 md:px-4 py-2 bg-white text-secondary border border-primary">Available</div>
                                                                        <div class="text-center rounded px-4 py-2 bg-primary text-secondary font-medium border border-secondary">Not Available</div>
                                                                        <div class="text-center rounded px-4 py-2 border border-secondary text-primary-light bg-dark">Slot Not Open</div>
                                                                        <div class="text-center rounded px-4 py-2 bg-green-600 text-white">Selected</div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <!-- Selected Date Display -->
                                                            <div class="text-center mt-4" x-show="newSeva.sevaDate && hideCalendarPostageChaturmasya == false">
                                                                <p class="text-sm text-primary text-left ml-3">Selected Date:
                                                                    <span x-text="formatDate(newSeva.sevaDate) || 'None'" class="text-primary"></span>
                                                                </p>
                                                            </div>

                                                            <div class="mt-10" x-show="showField('calendarType')">
                                                                <label for="calendarType" class="text-primary text-sm ml-1">Choose a calendar</label>
                                                                <div class="flex flex-wrap space-x-2 space-y-2">
                                                                    <template x-for="calendarType in calendarTypes"
                                                                        :key="calendarType.id">
                                                                        <button
                                                                            class="text-sm rounded-full px-4 py-2 shadow"
                                                                            :class="newSeva.calendarType == calendarType.id ? 'bg-primary text-white' : 'bg-primary-light text-white'"
                                                                            @click="newSeva.calendarType = calendarType.id; calculateSevaAmount()"
                                                                            x-text="calendarType.name"></button>
                                                                    </template>
                                                                </div>
                                                            </div>

                                                            <div class="grid grid-cols-1 lg:grid-cols-3 lg:gap-4 mt-10">

                                                                <div class="mt-5x" x-show="showField('fromDate') && getSecondPart()">
                                                                    <label for="fromDate"
                                                                        class="text-primary text-sm pointer-events-none transition-all duration-200 ml-2">From date</label>
                                                                    <input type="date" placeholder=""
                                                                        :min="getTomorrowDate()" x-model="newSeva.fromDate"
                                                                        @change="calculateSevaAmount()"
                                                                        class="text-sm text-primary  w-full border-l-0 border-r-0 border-t-0 border-primary border-b  focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-[#98649D] px-1 py-2 ml-1"
                                                                        x-effect="if (!newSeva.fromDate) newSeva.fromDate = getTomorrowDate()" />
                                                                </div>

                                                                <div class="mt-5x"
                                                                    x-show="showField('toDate') && !newSeva.noEnd && getSecondPart()">
                                                                    <label for="toDate"
                                                                        class="text-primary text-sm pointer-events-none transition-all duration-200 ml-2">To date</label>
                                                                    <input type="date" placeholder=""
                                                                        :min="getTomorrowDate()" x-model="newSeva.toDate" @change="endGameToggle()"
                                                                        class="text-sm placeholder:text-primary-light text-primary w-full border-l-0 border-r-0 border-t-0 border-primary border-b  focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-[#98649D] px-1 py-2 ml-1"
                                                                           x-effect="if (!newSeva.fromDate) newSeva.fromDate = getTomorrowDate()" />
                                                                </div>
                                                                <div class="mt-5x transform translate-y-3 lg:translate-y-0"
                                                                    x-show="showField('noEnd') && getSecondPart()">
                                                                    <label for="noEnd"
                                                                        class="text-primary text-sm pointer-events-none transition-all duration-200">Lifetime</label>
                                                                    <input type="checkbox" id="noEnd"
                                                                        x-model="newSeva.noEnd" @change="endGameToggle()"
                                                                        class="block text-sm placeholder:text-primary-light text-primary w-fullx border-primary focus:outline-none 
                                                                    appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-[#98649D] px-1 py-2 ml-1 mt-3 accent-[#98649D] checked:bg-[#98649D] checked:border-[#98649D]">
                                                                </div>
                                                            </div>
                                                            <p class="text-red-400 text-sm mt-4" x-text="getErrorForToDate()"></p>

                                                            <div class="mt-4 ml-1">
                                                                <p class="text-xs text-primary" x-show="newSeva.noEnd">Lifetime is considered as <span class="bold">20 years</span> for calculating the cost and postage.</p>
                                                            </div>

                                                            <div class="mt-8"
                                                                x-show="showField('type') && getSecondPart() && ( getErrorForToDate() == '' || newSeva.calendarType == 1)">
                                                                <label for="recurrenceType"
                                                                    class="text-primary text-sm ml-1">Choose a recurrence</label>
                                                                <div class="flex flex-wrap space-x-2 space-y-2">
                                                                    <template x-for="recurrenceType in recurrenceTypes"
                                                                        :key="recurrenceType.id">
                                                                        <button
                                                                            class="text-sm rounded-full px-4 py-2 shadow"
                                                                            :class="newSeva.type == recurrenceType.id ? 'bg-primary text-white' : 'bg-primary-light text-white'"
                                                                            @click="newSeva.type = recurrenceType.id; calculateSevaAmount()"
                                                                            x-text="recurrenceType.name"></button>
                                                                    </template>
                                                                </div>
                                                            </div>
                                                            <div class="grid grid-cols-1 lg:grid-cols-2 lg:gap-4 mt-10">
                                                                <div class="hidden" x-show="showField('calendarType')">
                                                                    <label for="calendarType" class=""></label>
                                                                    <select x-model="newSeva.calendarType" id="calendarType" @change="calculateSevaAmount()"
                                                                        class="text-sm text-left w-full border-0 text-primary appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-[#98649D] text-primary px-1">
                                                                        <option value="">Select Calendar type</option>
                                                                        <template x-for="calendarType in calendarTypes"
                                                                            :key="calendarType.id">
                                                                            <option :value="calendarType.id"
                                                                                x-text="calendarType.name"
                                                                                :selected="calendarType.id == newSeva.calendarType">
                                                                            </option>
                                                                        </template>
                                                                    </select>
                                                                    <div class="ml-1 border-b border-primary mr-2">
                                                                    </div>
                                                                </div>
                                                                <div class="mt-3 lg:mt-0 col-span-2 hidden"
                                                                    x-show="showField('type')">
                                                                    <label for="recurrenceType" class=""></label>
                                                                    <select x-model="newSeva.type"
                                                                        @change="calculateSevaAmount()" id="recurrenceType"
                                                                        class="text-sm text-left w-full border-0 text-primary appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-[#98649D] text-primary px-1">
                                                                        <option value="">Select recurrence</option>
                                                                        <template x-for="recurrenceType in recurrenceTypes"
                                                                            :key="recurrenceType.id">
                                                                            <option :value="recurrenceType.id"
                                                                                x-text="recurrenceType.name"
                                                                                :selected="recurrenceType.id == newSeva.type">
                                                                            </option>
                                                                        </template>
                                                                    </select>
                                                                    <div class="ml-1 border-b border-primary mr-2">
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div class="">
                                                                <div class="">
                                                                    <!-- month selection -->
                                                                    <div class="mb-8"
                                                                        x-show="showField('monthId') && showRecurringSevaField('monthId')">
                                                                        <label for="month" class=""></label>
                                                                        <select x-model="newSeva.monthId" id="month" @change="calculateSevaAmount()"
                                                                            class="text-sm text-left w-full border-0 text-primary appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-[#98649D] text-primary px-1">
                                                                            <option value="">Select a month</option>
                                                                            <template x-for="month in months" :key="month.id">
                                                                                <option :value="month.id" x-text="month.name"
                                                                                    :selected="month.id == newSeva.monthId">
                                                                                </option>
                                                                            </template>
                                                                        </select>
                                                                        <div class="ml-1 border-b border-primary mr-2">
                                                                        </div>
                                                                    </div>
                                                                    <!-- chandraMasa -->
                                                                    <div class="mb-8"
                                                                        x-show="showField('fromChandraMasaId') && showRecurringSevaField('fromChandraMasaId')">
                                                                        <label for="chandraMasa" class=""></label>
                                                                        <select x-model="newSeva.fromChandraMasaId"
                                                                            id="chandraMasa" @change="calculateSevaAmount()"
                                                                            class="text-sm text-left w-full border-0 text-primary appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-[#98649D] text-primary px-1">
                                                                            <option value="">Select a masa</option>
                                                                            <template x-for="chandraMasa in chandraMasas"
                                                                                :key="chandraMasa.id">
                                                                                <option :value="chandraMasa.id"
                                                                                    x-text="chandraMasa.name"
                                                                                    :selected="chandraMasa.id == newSeva.fromChandraMasaId">
                                                                                </option>
                                                                            </template>
                                                                        </select>
                                                                        <div class="ml-1 border-b border-primary mr-2">
                                                                        </div>
                                                                    </div>
                                                                    <!-- souramasa -->
                                                                    <div class="mb-8"
                                                                        x-show="showField('fromSouraMasaId') && showRecurringSevaField('fromSouraMasaId')">
                                                                        <label for="souraMasa" class=""></label>
                                                                        <select x-model="newSeva.fromSouraMasaId" id="souraMasa" @change="calculateSevaAmount()"
                                                                            class="text-sm text-left w-full border-0 text-primary appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-[#98649D] text-primary px-1">
                                                                            <option value="">Select a masa</option>
                                                                            <template x-for="souraMasa in souraMasas"
                                                                                :key="souraMasa.id">
                                                                                <option :value="souraMasa.id"
                                                                                    x-text="souraMasa.name"
                                                                                    :selected="souraMasa.id == newSeva.fromSouraMasaId">
                                                                                </option>
                                                                            </template>
                                                                        </select>
                                                                        <div class="ml-1 border-b border-primary mr-2">
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <!-- date / tithi / nakshatra -->
                                                                <div>
                                                                    <div class="bg-[#BD9CAC]/80 p-4 rounded-md mb-4"
                                                                        x-show="showField('specificDate') && showRecurringSevaField('specificDate')">
                                                                        <label for="specificDate" class=""></label>
                                                                        <select x-model="newSeva.specificDate" id="specificDate"
                                                                            @change="clearDropdown2(); calculateSevaAmount()"
                                                                            class="text-sm text-left w-full border-0 text-primary appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-[#98649D] text-primary px-1">
                                                                            <option value="">Select a Date</option>
                                                                            <template
                                                                                x-for="number in [...Array(31).keys()].map(i => i + 1)"
                                                                                :key="number">
                                                                                <option :value="number" x-text="number"
                                                                                    :selected="number == newSeva.specificDate">
                                                                                </option>
                                                                            </template>
                                                                        </select>
                                                                        <div class="ml-1 border-b border-primary mr-2">
                                                                        </div>
                                                                    </div>
                                                                    <label class="text-primary mb-2 block text-center" x-show="(newSeva.type == 3 || newSeva.type == 4) && newSeva.calendarType != 1">Select only one of these</label>
                                                                    <div class="bg-[#BD9CAC]/80 p-4 rounded-md mb-4"
                                                                        x-show="showField('fromTithiId') && showRecurringSevaField('fromTithiId')">
                                                                        <select x-model="newSeva.fromTithiId" id="tithi"
                                                                            @change="clearNakshatra(); calculateSevaAmount()"
                                                                            class="text-sm text-left w-full border-0 text-primary appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-[#98649D] text-primary px-1">
                                                                            <option value="">Select a Tithi</option>
                                                                            <template x-for="tithi in tithis" :key="tithi.id">
                                                                                <option :value="tithi.id" x-text="tithi.name"
                                                                                    :selected="tithi.id == newSeva.fromTithiId">
                                                                                </option>
                                                                            </template>
                                                                        </select>
                                                                        <div class="ml-1 border-b border-primary mr-2">
                                                                        </div>
                                                                    </div>
                                                                    <label class="text-primary mb-2 block text-center" x-show="(newSeva.type == 3 || newSeva.type == 4) && newSeva.calendarType != 1">OR</label>

                                                                    <div class="bg-[#BD9CAC]/80 p-4 rounded-md mb-4"
                                                                        x-show="showField('fromNakshatraId') && showRecurringSevaField('fromNakshatraId')">
                                                                        <label for="nakshatra" class=""></label>
                                                                        <select x-model="newSeva.fromNakshatraId" id="nakshatra"
                                                                            @change="clearTithi();  calculateSevaAmount()"
                                                                            class="text-sm text-left w-full border-0 text-primary appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-[#98649D] text-primary px-1">
                                                                            <option value="">Select a Nakshatra</option>
                                                                            <template x-for="nakshatra in nakshatras"
                                                                                :key="nakshatra.id">
                                                                                <option :value="nakshatra.id"
                                                                                    x-text="nakshatra.name"
                                                                                    :selected="nakshatra.id == newSeva.fromNakshatraId">
                                                                                </option>
                                                                            </template>
                                                                        </select>
                                                                        <div class="ml-1 border-b border-primary mr-2">
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <label class="text-primary mb-2 block text-center" x-show="newSeva.type == 3 || newSeva.type == 4">OR</label>

                                                                <!-- weekdayRepeatId and weekdayId -->
                                                                <div x-show="(showField('weekdayRepeatId') && showRecurringSevaField('weekdayRepeatId')) || (showField('weekdayId') && showRecurringSevaField('weekdayId'))" class="grid grid-cols-1 lg:grid-cols-2 lg:gap-4 bg-[#BD9CAC]/60 p-4 rounded-md">
                                                                    <div class=""
                                                                        x-show="showField('weekdayRepeatId') && showRecurringSevaField('weekdayRepeatId')">
                                                                        <label for="weekday" class=""></label>
                                                                        <select x-model="newSeva.weekdayRepeatId" id="weekday"
                                                                            @change="clearDropdown(); calculateSevaAmount()"
                                                                            class="text-sm text-left w-full border-0 text-primary appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-[#98649D] text-primary px-1">
                                                                            <option value="">Select weekday repeat</option>
                                                                            <template x-for="weekdayRepeat in weekdayRepeats"
                                                                                :key="weekdayRepeat.id">
                                                                                <option :value="weekdayRepeat.id"
                                                                                    x-text="weekdayRepeat.name"
                                                                                    :selected="weekdayRepeat.id == newSeva.weekdayRepeatId">
                                                                                </option>
                                                                            </template>
                                                                        </select>
                                                                        <div class="ml-1 border-b border-primary mr-2">
                                                                        </div>
                                                                    </div>
                                                                    <div class=""
                                                                        x-show="showField('weekdayId') && showRecurringSevaField('weekdayId')">
                                                                        <label for="weekday" class=""></label>
                                                                        <select x-model="newSeva.weekdayId" id="weekday"
                                                                            @change="clearDropdown(); calculateSevaAmount()"
                                                                            class="text-sm text-left w-full border-0 text-primary appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-[#98649D] text-primary px-1">
                                                                            <option value="">Select a weekday</option>
                                                                            <template x-for="weekday in weekdays"
                                                                                :key="weekday.id">
                                                                                <option :value="weekday.id"
                                                                                    x-text="weekday.name"
                                                                                    :selected="weekday.id == newSeva.weekdayId">
                                                                                </option>
                                                                            </template>
                                                                        </select>
                                                                        <div class="ml-1 border-b border-primary mr-2">
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <!-- seva info in words -->
                                                            <div class="text-primary mt-4 text-sm" x-show="newSeva?.calendarType">Seva Info : <span class="italic" x-text="sevaType(newSeva)"></span></div>
                                                            <div class="mt-10 flex justify-between text-primary text-sm ml-1"
                                                                x-show="showField('inAbsentia')">
                                                                <div><label class="">Seva Performed</label></div>
                                                                <div class="flex lg:space-x-4">
                                                                    <label class="mr-1 lg:mr-8 flex items-center space-x-2">
                                                                        <input type="radio" x-model="newSeva.inAbsentia"
                                                                            value="1"
                                                                            class=" w-3 h-3 text-primary bg-white border-primary-light focus:ring-[#98649D] focus:outline-none checked:bg-[#98649D] checked:border-[#98649D]">
                                                                        <span class="font-noto-sans">In Absentia</span>
                                                                    </label>
                                                                    <label class="flex items-center space-x-2">
                                                                        <input type="radio" x-model="newSeva.inAbsentia"
                                                                            value="0" @click="prasadamNeeded(false)"
                                                                            class=" w-3 h-3 text-primary bg-white border-primary-light focus:ring-[#98649D] focus:outline-none checked:bg-[#98649D] checked:border-[#98649D]">
                                                                        <span class="font-noto-sans">In Person</span>
                                                                    </label>
                                                                </div>
                                                            </div>
                                                            <div x-show="selectedSevaType?.id !== 3"
                                                                class="ml-1 border-b border-primary my-1 hiddden"></div>
                                                            <!--  prasadam post -->
                                                            <div class="mt-12 flex justify-between text-primary text-sm ml-1"
                                                                x-show="showField('receivePrasadam') && newSeva.inAbsentia == 1 && getThirdPart()">
                                                                <div>
                                                                    <label class="text-left">Receive prasadam via Post</label>
                                                                </div>
                                                                <div class="flex space-x-8 lg:space-x-24 mr-4 lg:mr-12">
                                                                    <label class="mr-1 flex items-center space-x-2">
                                                                        <input type="radio"
                                                                            x-model="newSeva.receivePrasadam"
                                                                            @click="prasadamNeeded(true)" :value="true"
                                                                            class=" w-3 h-3 text-primary bg-white border-primary-light focus:ring-[#98649D] focus:outline-none checked:bg-[#98649D] checked:border-[#98649D]">
                                                                        <span class="font-noto-sans">Yes</span>
                                                                    </label>
                                                                    <label class="flex items-center space-x-2">
                                                                        <input
                                                                            class="w-3 h-3 text-primary bg-white border-primary-light focus:ring-[#98649D] focus:outline-none checked:bg-[#98649D] checked:border-[#98649D]"
                                                                            type="radio" x-model="newSeva.receivePrasadam"
                                                                            @click="prasadamNeeded(false)" :value="false">
                                                                        <span class="font-noto-sans">No</span>
                                                                    </label>
                                                                </div>
                                                            </div>
                                                            <div x-show="newSeva.inAbsentia == 1 && getThirdPart()"
                                                                class="ml-1 border-b border-primary my-1"></div>
                                                            <div x-show="newSeva.type == 1 && newSeva.receivePrasadam == 'true'">
                                                                <p class="ml-2 text-xs text-primary">Seva is performed everyday. Prasadam is sent once every week.</p>
                                                            </div>
                                                            <div x-show="newSeva.inAbsentia == 1 && newSeva.receivePrasadam == 'true' && hideCalendarPostageChaturmasya == true">
                                                                <p class="italic text-primary mt-4 text-sm">* The postage charges are included in Seva amount.</p>
                                                            </div>
                                                            <div x-show="newSeva.inAbsentia == 1 && newSeva.receivePrasadam == 'true' && hideCalendarPostageChaturmasya == false"
                                                                class="mt-16 bg-secondary-light p-4 rounded-md">
                                                                <select name="postageOptions" id="postageOptions" class="text-sm text-left w-full border-0 text-primary appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-[#98649D] text-primary px-1"
                                                                    @change="handlePostage($event)">
                                                                    <option value="">Select postage</option>
                                                                    <template x-for="option in postageOptions"
                                                                        :key="option.id">
                                                                        <option :value="JSON.stringify({ id: option.id, amount: option.amount })"
                                                                            :selected="option.id === newSeva.postageId"
                                                                            x-text="`${option.name} - ₹${option.amount}`">
                                                                        </option>
                                                                    </template>
                                                                </select>
                                                                <div class="ml-1 border-b border-primary"></div>
                                                            </div>
                                                            <!-- Seva Amount -->
                                                            <div class=" mt-8 text-primary" x-show="getFourthPart()">
                                                                <div class="flex flex-col justify-center">
                                                                    <div class=" text-primary flex items-center justify-between gap-4 opacity-50" x-show="!isGuruBhikshavandanamDailyLifetime">
                                                                        <p class="text-sm pl-2 text-left">
                                                                            Seva
                                                                        </p>
                                                                        <div class="flex items-center justify-center lg:pl-6">
                                                                            <p class="flex items-center justify-center lg:text-xl">
                                                                                <span class="" x-text="`₹`"></span>
                                                                                <span class="mx-2" x-text="formatNumber(newSevaAmount)"></span>
                                                                            </p>
                                                                            <p x-show="selectedSevaType?.id === 3">
                                                                                <span> x </span>
                                                                                <span class="" x-text="sevaAmountMultiplication"></span>
                                                                                <span>=</span>
                                                                            </p>
                                                                        </div>
                                                                        <p x-show="selectedSevaType?.id === 3" class="flex items-center justify-center lg:text-xl">
                                                                            <span class="" x-text="`₹`"></span>
                                                                            <span class=" ml-2" x-text="formatNumber(sevaAmountMultiplication * newSevaAmount)"></span>
                                                                        </p>
                                                                    </div>
                                                                    <div class="ml-1 my-2 border-b border-primary" x-show="!isGuruBhikshavandanamDailyLifetime && newSeva.receivePrasadam == 'true'"></div>
                                                                    <!-- Postage Amount -->
                                                                    <div class=" text-primary flex items-center justify-between gap-4 opacity-50" x-show="!isGuruBhikshavandanamDailyLifetime && newSeva.receivePrasadam == 'true'">
                                                                        <p class="text-sm pl-2 text-left">
                                                                            Postage
                                                                        </p>
                                                                        <div class="flex items-center justify-center">
                                                                            <p class="flex items-center justify-center lg:text-xl">
                                                                                <span class="" x-text="`₹`"></span>
                                                                                <span class=" mx-2" x-text="newSevaPostageAmount"></span>
                                                                            </p>
                                                                            <p x-show="selectedSevaType?.id === 3">
                                                                                <span>x</span>
                                                                                <span x-text="postageAmountMultiplication"></span>
                                                                                <span>=</span>
                                                                            </p>
                                                                        </div>
                                                                        <p x-show="selectedSevaType?.id === 3" class="flex items-center justify-center lg:text-xl">
                                                                            <span class="" x-text="`₹`"></span>
                                                                            <span class=" ml-2" x-text="formatNumber(postageAmountMultiplication * newSevaPostageAmount)"></span>
                                                                        </p>
                                                                    </div>
                                                                    <div class="ml-1 my-2 border-b border-primary" x-show="!isGuruBhikshavandanamDailyLifetime"></div>
                                                                    <div class=" text-primary font-semibold flex items-center justify-between gap-4" x-show="!isGuruBhikshavandanamDailyLifetime">
                                                                        <p class="text-sm pl-2 text-left">
                                                                            Total Amount
                                                                        </p>
                                                                        <p class="flex items-center justify-center">
                                                                            <span class="text-xl lg:text-2xl" x-text="`₹`"></span>
                                                                            <span class="text-4xl ml-2" x-text="formatNumber(sevaAmountMultiplication * newSevaAmount + postageAmountMultiplication * newSevaPostageAmount)"></span>
                                                                        </p>
                                                                    </div>
                                                                    <div class=" text-primary font-semibold flex items-center justify-between gap-4" x-show="isGuruBhikshavandanamDailyLifetime">
                                                                        <p class="text-sm pl-2 text-left">
                                                                            Total Amount
                                                                        </p>
                                                                        <p class="flex items-center justify-center">
                                                                            <span class="text-xl lg:text-2xl" x-text="`₹`"></span>
                                                                            <span class="text-4xl ml-2" x-text="formatNumber(2500000)"></span>
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <!-- Validation Messages -->
                                                            <div x-show="validationMessages.length"
                                                                class="text-red-500 text-sm text-center mt-12">
                                                                <template x-for="message in validationMessages"
                                                                    :key="message">
                                                                    <p x-text="message"></p>
                                                                </template>
                                                            </div>
                                                            <div class="flex items-center justify-center mt-16 mb-2" x-show="getProceedButton()">
                                                                <button @click="validateStep1()"
                                                                    class="font-noto-sans bg-dark text-white flex items-center justify-around uppercase w-3/5 md:w-1/3 lg:w-2/5 py-3 px-12 rounded-md text-md">
                                                                    Proceed <span
                                                                        class="ml-8 lg:ml-4 material-icons text-[16px]">arrow_forward</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </template>
                                                    <template x-if="currentStep === 2">
                                                        <div class="space-y-8 font-noto-serif">
                                                            <button
                                                                class="text-right w-full text-sm text-primary underline"
                                                                @click="showKartaListOP = !showKartaListOP">+ Pick karta
                                                                from list</button>
                                                            <div class="w-full text-sm p-4 rounded-lg shadow-lg"
                                                                x-show="showKartaListOP" @click.away="showKartaListOP = false">
                                                                <h2 class="text-lg font-semibold mb-2 ml-2 text-primary">Kartas</h2>
                                                                <template x-for="kartaRef in user.kartas">
                                                                    <button
                                                                        class="flex items-start space-x-2 cursor-pointer w-full text-primary hover:bg-[#98649D]/50 p-2 rounded-lg"
                                                                        @click="selectKartaOP(kartaRef)">
                                                                        <span class="w-1/3 text-left font-semibold"
                                                                            x-text="kartaRef.name"></span>
                                                                        <span class="w-1/3 text-left font-semibold"
                                                                            x-text="kartaRef.gotra"></span>
                                                                        <span class="w-1/3 text-left"
                                                                            x-text="kartaRef.nakshatraDisp"></span>
                                                                        <span class="w-1/3 text-left"
                                                                            x-text="kartaRef.rashiDisp"></span>
                                                                    </button>
                                                                </template>
                                                            </div>
                                                            <div class="lg:mt-5">
                                                                <label for="kartaName" class=""></label>
                                                                <input type="text" placeholder="Name" x-model="newSeva.name" @click.away="xt(newSeva, 'name', 'nameK')"
                                                                    @blur="xt(newSeva, 'name', 'nameK')"
                                                                    class="placeholder:italic text-sm placeholder:text-primary-light text-primary w-full border-l-0 border-r-0 border-t-0 border-primary border-b focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-[#98649D] px-1 py-2 ml-1 mr-2">
                                                                <span class="ml-2 text-sm text-primary"
                                                                    x-text="newSeva.nameK"></span>
                                                            </div>
                                                            <div class="lg:mt-5" x-show="!showAddressStep">
                                                                <label for="kartaCity" class=""></label>
                                                                <input type="text" placeholder="City" x-model="newSeva.city" @click.away="xt(newSeva, 'city', 'cityK')"
                                                                    @blur="xt(newSeva, 'city', 'cityK')"
                                                                    class="placeholder:italic text-sm placeholder:text-primary-light text-primary w-full border-l-0 border-r-0 border-t-0 border-primary border-b focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-[#98649D] px-1 py-2 ml-1 mr-2">
                                                                <span class="ml-2 text-sm text-primary"
                                                                    x-text="newSeva.cityK"></span>
                                                            </div>
                                                            <div class="lg:mt-5">
                                                                <label for="kartaGotra" class=""></label>
                                                                <input type="text" placeholder="Gotra" x-model="newSeva.gotra" @click.away="xt(newSeva, 'gotra', 'gotraK')"
                                                                    @blur="xt(newSeva, 'gotra', 'gotraK')"
                                                                    class="placeholder:italic text-sm placeholder:text-primary-light text-primary w-full border-l-0 border-r-0 border-t-0 border-primary border-b focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-[#98649D] px-1 py-2 ml-1 mr-2">
                                                                <span class="ml-2 text-sm text-primary"
                                                                    x-text="newSeva.gotraK"></span>
                                                            </div>
                                                            <div class="">
                                                                <label for="sevaNakshatra" class=""></label>
                                                                <select x-model="newSeva.nakshatraId" id="sevaNakshatra"
                                                                    @change="getRashis(newSeva.nakshatraId, 'newSeva')"
                                                                    class="text-sm text-left w-full border-0 text-primary appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-[#98649D] text-primary px-1">
                                                                    <option value="">Select a nakshatra (Optional)</option>
                                                                    <template x-for="nakshatra in nakshatras"
                                                                        :key="nakshatra.id">
                                                                        <option :value="nakshatra.id"
                                                                            x-text="nakshatra.name"
                                                                            :selected="nakshatra.id == newSeva.nakshatraId">
                                                                        </option>
                                                                    </template>
                                                                </select>
                                                                <div class="ml-1 border-b border-primary-light mr-2"></div>
                                                            </div>
                                                            <div class="">
                                                                <label for="sevaRashi" class=""></label>
                                                                <select x-model="newSeva.rashiId" id="sevaRashi"
                                                                    class="text-sm text-left w-full border-0 text-primary appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-[#98649D] text-primary px-1">
                                                                    <option value="">Select a rashi (Optional)</option>
                                                                    <template
                                                                        x-for="rashi in dispRashisMap['newSeva'] || []"
                                                                        :key="rashi.id">
                                                                        <option :value="rashi.id" x-text="rashi.name"
                                                                            :selected="rashi.id == newSeva.rashiId">
                                                                        </option>
                                                                    </template>
                                                                </select>
                                                                <div class="ml-1 border-b-2 border-primary-light mr-2"></div>
                                                            </div>
                                                            <!-- Validation Messages -->
                                                            <div x-show="validationMessages.length"
                                                                class="text-red-500 text-sm text-center mb-4">
                                                                <template x-for="message in validationMessages"
                                                                    :key="message">
                                                                    <p x-text="message"></p>
                                                                </template>
                                                            </div>
                                                            <div class="flex items-center justify-between font-noto-sans">
                                                                <div class="flex justify-center mt-8 mb-2 w-1/3">
                                                                    <button @click="currentStep = 1; validationMessages = []"
                                                                        class="ml-8 lg:ml-1 text-primary text-sm border border-primary bg-white uppercase py-3 px-3 lg:pr-8 lg:pl-4 rounded-md flex items-center">
                                                                        <span
                                                                            class="material-icons text-sm">arrow_backward</span>
                                                                        Back
                                                                    </button>
                                                                </div>
                                                                <div class="flex justify-center mt-8 mb-2 w-1/3">
                                                                    <button @click="validateStep2()"
                                                                        class="bg-dark text-md text-white uppercase py-3 rounded-md flex items-center"
                                                                        :class="newSeva.receivePrasadam ? 'mr-4 px-4' : 'mr-0 px-4 lg:px-8'"><span
                                                                            x-text="newSeva.receivePrasadam ? 'Proceed' : 'Add Seva'"></span>
                                                                        <span class="ml-4 material-icons text-sm"
                                                                            x-show="newSeva.receivePrasadam">arrow_forward</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </template>
                                                    <template x-if="currentStep === 3 && showAddressStep">
                                                        <div class="font-noto-serif space-y-8">
                                                            <button
                                                                class="text-right w-full text-sm text-primary underline"
                                                                @click="showAddressOP = !showAddressOP">+ Pick address from
                                                                list</button>
                                                            <div class="w-full text-sm p-4 rounded-lg shadow-lg"
                                                                x-show="showAddressOP" @click.away="showAddressOP = false">
                                                                <h2 class="text-lg font-semibold mb-2 ml-2 text-primary">Addresses</h2>
                                                                <template x-for="addressRef in user.addresses">
                                                                    <button
                                                                        class="flex items-start space-x-2 cursor-pointer text-primary w-full hover:bg-[#98649D]/50 p-2 rounded-lg"
                                                                        @click="selectAddressOP(addressRef)">
                                                                        <span class="w-1/3 text-left font-semibold"
                                                                            x-text="addressRef.addresseeName"></span>
                                                                        <span class="w-1/3 text-left"
                                                                            x-text="addressRef.addressLine1"></span>
                                                                        <span class="w-1/3 text-left"
                                                                            x-text="addressRef.city"></span>
                                                                    </button>
                                                                </template>
                                                            </div>
                                                            <div class="lg:mt-5">
                                                                <input type="text" id="AddresseeName"
                                                                    placeholder="Addressee Name"
                                                                    x-model="newSeva.addresseeName" class="placeholder:italic text-sm placeholder:text-primary-light text-primary  w-full border-l-0 border-r-0 border-t-0 border-primary border-b text-sm py-2 focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0
                                                            hover:border-[#98649D] text-primary px-1 ml-1">
                                                            </div>
                                                            <div class="">
                                                                <input type="text" id="streetAddress"
                                                                    x-model="newSeva.addressLine1"
                                                                    placeholder="Street and Area Address" class="placeholder:italic text-sm placeholder:text-primary-light text-primary  w-full border-l-0 border-r-0 border-t-0 border-primary border-b text-sm py-2 focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0
                                                            hover:border-[#98649D] text-primary px-1 ml-1">
                                                            </div>
                                                            <div class="">
                                                                <input type="text" id="locality"
                                                                    x-model="newSeva.addressLine2" placeholder="Locality"
                                                                    class="placeholder:italic text-sm placeholder:text-primary-light text-primary  w-full border-l-0 border-r-0 border-t-0 border-primary border-b text-sm py-2 focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0
                                                            hover:border-[#98649D] text-primary px-1 ml-1">
                                                            </div>

                                                            <div class="">
                                                                <input type="text" id="landmark" x-model="newSeva.landmark"
                                                                    placeholder="Landmark" class="placeholder:italic text-sm placeholder:text-primary-light text-primary  w-full border-l-0 border-r-0 border-t-0 border-primary border-b text-sm py-2 focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0
                                                            hover:border-[#98649D] text-primary px-1 ml-1">
                                                            </div>
                                                            <div class="grid grid-cols-2 my-4">
                                                                <div class="text-sm">
                                                                    <label for="AddresseeCountry" class=""></label>
                                                                    <input type="text" id="AddresseeCountry"
                                                                        placeholder="Country" x-model="newSeva.country"
                                                                        class="placeholder:italic text-sm placeholder:text-primary-light text-primary  w-full border-l-0 border-r-0 border-t-0 border-primary border-b text-sm py-2 focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0
                                                            hover:border-[#98649D] text-primary px-1 ml-1"
                                                                        @keyup="filterCountries()">
                                                                    <div class="absolute z-10 bg-gray-200 w-1/3 border-0"
                                                                        x-show="filteredCountries.length > 0">
                                                                        <ul>
                                                                            <template x-for="country in filteredCountries">
                                                                                <li @click="setCountry(country)" class="hover:bg-gray-300 text-sm placeholder:text-primary-light text-primary w-full text-sm py-2 focus:outline-none text-sm py-2 focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0
                                                                 text-primary px-1" x-text="country.name"></li>
                                                                            </template>
                                                                        </ul>
                                                                    </div>
                                                                </div>
                                                                <div class="w-1/2 ml-20 lg:ml-28">
                                                                    <p class="text-xs lg:text-sm text-primary -mt-4">
                                                                        Pincode
                                                                    </p>
                                                                    <input type="text" id="pincode"
                                                                        x-model="newSeva.pincode" class="placeholder:italic text-sm placeholder:text-primary-light text-primary  w-full border-l-0 border-r-0 border-t-0 border-primary border-b text-sm py-2 focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0
                                                            hover:border-[#98649D] text-primary px-1 ml-1">
                                                                </div>
                                                            </div>
                                                            <div class="">
                                                                <label for="AddresseeState" class=""></label>
                                                                <input type="text" id="AddresseeState" placeholder="State"
                                                                    x-model="newSeva.state" class="placeholder:italic text-sm placeholder:text-primary-light text-primary  w-full border-l-0 border-r-0 border-t-0 border-primary border-b text-sm py-2 focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0
                                                            hover:border-[#98649D] text-primary px-1 ml-1"
                                                                    @keyup="filterStates()">
                                                                <div class="absolute z-10 bg-gray-200 w-1/3 border-0"
                                                                    x-show="filteredStates.length > 0">
                                                                    <ul>
                                                                        <template x-for="state in filteredStates">
                                                                            <li @click="setState(state)"
                                                                                class="p-2 cursor-pointer hover:bg-gray-300"
                                                                                x-text="state.name"></li>
                                                                        </template>
                                                                    </ul>
                                                                </div>
                                                                <div class="mb-4 mt-6">
                                                                    <input type="text" id="city"
                                                                        placeholder="Town / Village / City"
                                                                        x-model="newSeva.city" class="placeholder:italic text-sm placeholder:text-primary-light text-primary  w-full border-l-0 border-r-0 border-t-0 border-primary border-b text-sm py-2 focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0
                                                            hover:border-[#98649D] text-primary px-1 ml-1"
                                                                        @keyup="filterCities()">
                                                                    <div class="absolute z-10 bg-gray-200 w-1/3 border-0"
                                                                        x-show="filteredCities.length > 0">
                                                                        <ul>
                                                                            <template x-for="city in filteredCities">
                                                                                <li @click="setCity(city)"
                                                                                    class="p-2 cursor pointer hover:bg-gray-300"
                                                                                    x-text="city.name"></li>
                                                                            </template>
                                                                        </ul>
                                                                    </div>
                                                                </div>
                                                                <div class="mt-6">
                                                                    <input type="text" id="mobileNumber"
                                                                        placeholder="Alternate Phone"
                                                                        x-model="newSeva.alternatePhone" class="placeholder:italic text-sm placeholder:text-primary-light text-primary w-full border-l-0 border-r-0 border-t-0 border-b border-primary text-sm py-2 focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0
                                                                        hover:border-[#98649D] text-primary px-1 ml-1">
                                                                </div>
                                                            </div>
                                                            <!-- Validation Messages -->
                                                            <div x-show="currentStep == 3 && validationMessages.length"
                                                                class="text-red-500 text-sm text-center mb-4">
                                                                <template x-for="message in validationMessages"
                                                                    :key="message">
                                                                    <p x-text="message"></p>
                                                                </template>
                                                            </div>
                                                            <div class="flex items-center justify-between lg:space-x-4 font-noto-sans">
                                                                <div class="flex justify-center mt-6 mb-4 lg:w-1/3">
                                                                    <button @click="currentStep = 2; validationMessages = []"
                                                                        class=" text-primary text-md border border-primary bg-white uppercase py-3 px-2 lg:pr-8 lg:pl-4 rounded-md flex items-center">
                                                                        <span
                                                                            class="material-icons text-sm">arrow_backward</span>
                                                                        Back
                                                                    </button>
                                                                </div>
                                                                <div class="flex justify-center mt-6 mb-4">
                                                                    <button @click="validateStep3()"
                                                                        class="bg-dark text-white uppercase py-3 px-4 rounded text-md">
                                                                        Add seva booking
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </template>
                                                </div>
                                            </div>
                                            <template x-if="currentStep === 4">
                                                <div class="min-h-screen">
                                                    <div class="text-center text-white">
                                                        <h1 class="text-3xl font-bold pt-16 pb-8 italic font-noto-sans">Seva
                                                            successfully added
                                                        </h1>
                                                        <div class="flex flex-col space-y-8">
                                                            <div class="lg:ml-4 lg:mr-6 mx-2 md:mx-20">
                                                                <template x-for="(selectedSeva, index) in selectedSevas"
                                                                    :key="index">
                                                                    <div class="pt-8">
                                                                        <div class="flex items-center justify-between">
                                                                            <div class="flex space-x-2">
                                                                                <div class="rounded-full text-primary bg-gray-200 w-9 h-9 flex items-center justify-center font-semibold"
                                                                                    x-text="index +1"></div>
                                                                                <div class="flex flex-col text-sm pl-4">
                                                                                    <div class="text-left">
                                                                                        <p class="font-semibold"
                                                                                            x-text="selectedSeva.sannidhiName">
                                                                                        </p>
                                                                                        <p> <span
                                                                                                x-text="`${selectedSeva.deitySevaName} - ₹ `"></span>
                                                                                            <span
                                                                                                x-text="formatNumber(selectedSeva.amount)"></span>
                                                                                        </p>
                                                                                        <p
                                                                                            x-show="selectedSeva.postageCharges">
                                                                                            <span
                                                                                                x-text="`Postage - ₹ `"></span>
                                                                                            <span
                                                                                                x-text="formatNumber(selectedSeva.postageCharges)"></span>
                                                                                        </p>
                                                                                        <p>
                                                                                            <span
                                                                                                class="italic">Karta</span>:
                                                                                            <span
                                                                                                x-text="selectedSeva.name"></span>
                                                                                            <span
                                                                                                x-show="selectedSevaType?.id === 2"
                                                                                                x-text="selectedSeva.inAbsentia == 1 ? ' (In Absentia)' : ' (In Person)'">
                                                                                            </span>
                                                                                        </p>
                                                                                    </div>
                                                                                    <template
                                                                                        x-if="selectedSevaType?.id === 2">
                                                                                        <p class="mt-4 text-left"
                                                                                            x-text="formatDate(selectedSeva.sevaDate)">
                                                                                        </p>
                                                                                    </template>
                                                                                    <template
                                                                                        x-if="selectedSevaType?.id === 3">
                                                                                        <p class="mt-4 text-left">
                                                                                            <span
                                                                                                x-text="formatDate(selectedSeva.fromDate) + ' - '"></span>
                                                                                            <span
                                                                                                x-text="selectedSeva.noEnd ? 'Lifetime' : formatDate(selectedSeva.toDate)"></span>
                                                                                        </p>
                                                                                    </template>
                                                                                </div>
                                                                            </div>
                                                                            <div class="flex flex-col text-md items-between">
                                                                                <p class="font-noto-serif text-2xl text-right">
                                                                                    <span x-text="`₹ `"></span>
                                                                                    <span x-text="formatNumber(selectedSeva.totalAmount)"></span>
                                                                                </p>
                                                                                <p @click="editSevaClick(selectedSeva, index)" class="border border-white rounded-md text-xs px-2 py-1 text-white cursor-pointer mt-4" x-show="selectedSevaType?.id === 2">Edit Seva</p>
                                                                                <button class="mt-10 uppercase text-white bg-primary border border-white rounded-md text-sm px-4 py-1"
                                                                                    @click="removeSeva(index)">Remove</button>
                                                                            </div>
                                                                        </div>
                                                                        <div class="border-b border-white mt-8"></div>
                                                                    </div>
                                                                </template>
                                                                <div class="mt-4 pb-8 text-right font-noto-serif">
                                                                    <span class=" uppercase">Payment Due</span> <br>
                                                                    <p class="font-semibold text-2xl "><span
                                                                            x-text="`₹ `"></span> <span
                                                                            x-text="formatNumber(totalSevaAmount)"></span>
                                                                    </p>
                                                                </div>
                                                                <div class="flex space-x-4 md:justify-between my-16">
                                                                    <button
                                                                        class="rounded-md px-2 md:px-6 lg:px-8 font-bold py-2 md:py-3 lg:py-6 text-lg flex items-center bg-primary text-white border border-white lg:w-2/5"
                                                                        @click="currentStep = 1; hideCalendarPostageChaturmasya = false;">
                                                                        <span class="mr-2 lg:mr-6">+</span> Add Another
                                                                        Seva</button>
                                                                    <button @click="showPayeeModal()"
                                                                        class="rounded-md px-2 md:px-6 lg:px-8 font-bold py-2 md:py-3 lg:py-6 text-lg flex items-center bg-white text-primary lg:w-2/5">Proceed
                                                                        to pay <span class="material-icons text-[18px] ml-6">arrow_forward</span></button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </template>
                                        </div>
                                    </template>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
    </div>
    </template>

    <!-- footer -->
    <div>
        <div class="pl-0 lg:pl-4 pb-8 lg:pb-12"
            style="background-image: url('./assets/images/background-tan-texture-web.jpg')">
            <div class="lg:container lg:mx-auto md:ml-20">
                <div class="grid grid-cols-12 gap-6">
                    <div
                        class="mt-16 text-[#7e6f5c] col-span-9 col-start-3 lg:col-span-4 lg:col-start-3 flex flex-col text-left">
                        <div class="mt-4"><a href="https://sringeri.net/"
                                class="bg-[#E26114] text-white uppercase rounded-lg py-3 px-6 lg:px-12 text-center cursor-pointer">go
                                to sringeri homepage</a></div>
                        <div class="pt-24 text-md"><a href="/terms" class="uppercase">terms and conditions</a></div>
                        <div class="pt-6 text-md"><a href="/privacy" class="uppercase">privacy policy</a></div>
                    </div>
                    <div
                        class="mt-16 text-[#7e6f5c] col-span-8 col-start-3 lg:col-span-3 lg:col-start-9 space-y-2 flex flex-col text-left">
                        <p class="uppercase font-serif text-[#E26114]">Contact Information</p>
                        <div class="">
                            <p class="mt-2 text-md">The Administrator,<br>Sringeri Math and its Properties,<br>Sringeri,
                                Chikkamagaluru District,<br>Karnataka - 577139</p>
                            <p class="mt-6 text-sm">+91-8265-252525</p>
                            <p class="mt-2 text-sm">+91-8265-262626</p>
                            <p class="mt-2 text-sm">+91-8265-272727</p>
                            <p class="mt-6 lg:mb-8 text-md font-bold italic">seva@sringeri.net</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div style="background-image: url('./assets/images/background-tan-texture-web.jpg')">
            <hr>
            <p class="text-center text-sm lg:text-md text-[#7e6f5c] py-4 px-4 lg:px-0 w-full">&copy; <span
                    x-text="new Date().getFullYear()"></span>. All Rights
                Reserved by Dakshinamnaya Sri Sharada Peetham, Sringeri</p>
        </div>
    </div>
    </div>



    <script>
        function data() {
            return {
                home: true,
                user: {
                    name: '',
                    city: '',
                    countryCode: '',
                    mobile: '',
                    email: '',
                    uid: '',
                    isAnonymous: "",
                    addresses: [],
                    kartas: [],
                },
                async init() {
                    // this.selectSevaType(this.sevaTypes[0]);
                    await this.checkLogin();
                    this.resetSeva();
                },
                showPayeeModal() {
                    this.payeeModal = true;
                    this.isCartOpen = false;
                    this.newSeva.name = this.user.name;
                    this.newSeva.addresseeMobile = this.user.mobile;
                    this.newSeva.countryCode = this.user.countryCode;
                    this.newSeva.email = this.user.email;
                    this.newSeva.addresseePlace = this.user.city;
                },
                clearPayeeModal() {
                    this.newSeva.name = "";
                    this.newSeva.addresseeMobile = "";
                    this.newSeva.countryCode = "";
                    this.newSeva.email = "";
                    this.newSeva.addresseePlace = "";
                },
                showLogout: false,
                menuItems: [{
                        id: 'bookSeva',
                        name: 'Book a Seva',
                        link: '/online-seva'
                    },
                    {
                        id: 'makeDonation',
                        name: 'Make a Donation',
                        link: 'https://donate.sringeri.net/online-donation'
                    },
                    {
                        id: 'bookAccommodation',
                        name: 'Book Accommodation',
                        link: '/yatri'
                    },
                    {
                        id: 'viewProfile',
                        name: 'My Profile',
                        link: '/devotee-profile',
                        isVisible: !this.user?.isAnonymous
                    }
                ],
                async fetchDevoteeDetails() {
                    const uid = this.user.uid; // Replace this with actual UID fetching
                    try {
                        let response = await fetch(`https://onlineservices.sringeri.net/api/onlineDevotee/${uid}`);
                        let data = await response.json();
                        this.user.name = data.name;
                        this.user.city = data.city;
                        this.user.countryCode = data.countryCode;
                        this.user.mobile = data.mobile;
                        this.user.email = data.email;
                        this.user.isAnonymous = data.isAnonymous;
                        this.user.uid = data.uid;
                    } catch (error) {
                        console.error("Error fetching user data:", error);
                    }
                },
                async fetchAddresses() {
                    const response = await fetch(`https://onlineservices.sringeri.net/api/devoteeAddress/${this.user.uid}`);
                    this.user.addresses = await response.json();
                },
                async fetchKartas() {
                    const response = await fetch(`https://onlineservices.sringeri.net/api/devoteeKarta/${this.user.uid}`);
                    this.user.kartas = await response.json();
                    // console.log("Kartas:", this.user.kartas);
                },
                showKartaListFL: false,
                async selectKartaFL(_kartaRef) {
                    this.newPayee.name = _kartaRef.name;
                    this.newPayee.nakshatraId = _kartaRef.nakshatraId;
                    await this.getRashis(_kartaRef.nakshatraId, 'newPayee');
                    this.newPayee.rashiId = _kartaRef.rashiId;
                    this.showKartaListFL = false;
                },
                showKartaListOP: false,
                async selectKartaOP(_kartaRef) {
                    this.newSeva.name = _kartaRef.name;
                    this.newSeva.gotra = _kartaRef.gotra;
                    this.newSeva.gotraK = _kartaRef.gotraK;
                    this.newSeva.nakshatraId = _kartaRef.nakshatraId;
                    await this.getRashis(_kartaRef.nakshatraId, 'newSeva');
                    this.newSeva.rashiId = _kartaRef.rashiId;
                    this.showKartaListOP = false;
                },
                showAddressOP: false,
                async selectAddressOP(_addressRef) {
                    this.newSeva.addresseeName = _addressRef.addresseeName;
                    this.newSeva.addressLine1 = _addressRef.addressLine1;
                    this.newSeva.addressLine2 = _addressRef.addressLine2;
                    this.newSeva.landmark = _addressRef.landmark;
                    this.newSeva.country = _addressRef.country;
                    this.newSeva.pincode = _addressRef.pincode;
                    this.newSeva.state = _addressRef.state;
                    this.newSeva.city = _addressRef.city;
                    this.newSeva.alternatePhone = _addressRef.alternatePhone;
                    this.showAddressOP = false;
                },
                weekdays: [{
                        id: 1,
                        name: "Monday"
                    },
                    {
                        id: 2,
                        name: "Tuesday"
                    },
                    {
                        id: 3,
                        name: "Wednesday"
                    },
                    {
                        id: 4,
                        name: "Thursday"
                    },
                    {
                        id: 5,
                        name: "Friday"
                    },
                    {
                        id: 6,
                        name: "Saturday"
                    },
                    {
                        id: 7,
                        name: "Sunday"
                    },
                ],
                // TODO: disable selection of "every" weekday in monthly recurrence.
                weekdayRepeats: [{
                        id: 1,
                        name: "1st"
                    },
                    {
                        id: 2,
                        name: "2nd"
                    },
                    {
                        id: 3,
                        name: "3rd"
                    },
                    {
                        id: 4,
                        name: "4th"
                    },
                    {
                        id: 6,
                        name: "Last"
                    },
                    {
                        id: 7,
                        name: "Every"
                    },
                ],
                months: [{
                        id: 1,
                        name: "January"
                    },
                    {
                        id: 2,
                        name: "February"
                    },
                    {
                        id: 3,
                        name: "March"
                    },
                    {
                        id: 4,
                        name: "April"
                    },
                    {
                        id: 5,
                        name: "May"
                    },
                    {
                        id: 6,
                        name: "June"
                    },
                    {
                        id: 7,
                        name: "July"
                    },
                    {
                        id: 8,
                        name: "August"
                    },
                    {
                        id: 9,
                        name: "September"
                    },
                    {
                        id: 10,
                        name: "October"
                    },
                    {
                        id: 11,
                        name: "November"
                    },
                    {
                        id: 12,
                        name: "December"
                    },
                ],
                rashis: [],
                tithis: [],
                chandraMasas: [],
                souraMasas: [],
                recurrenceTypes: [],
                recurrenceTypesDisp: [],
                calendarTypes: [],
                countryCodes: [],
                getData: async function(_url) {
                    let response = await fetch(_url);
                    let data = await response.json();
                    return data;
                },
                async fetchData() {
                    this.frequentSevas = await this.getData('/api/onlineFrequentSevas');
                    this.calendarTypes = await this.getData('/api/calendarTypes');
                    this.recurrenceTypes = await this.getData('/api/recurrenceTypes');
                    this.tithis = await this.getData('/api/tithis');
                    this.chandraMasas = await this.getData('/api/chandraMasas');
                    this.souraMasas = await this.getData('/api/souraMasas');
                    this.nakshatras = await this.getData('/api/nakshatras');
                    this.user.kartas = await this.getData('/api/devoteeKarta/' + this.user.uid);
                    this.user.addresses = await this.getData('/api/devoteeAddress/' + this.user.uid);
                    await this.fetchDevoteeDetails();
                    this.countryCodes = await this.getData('/assets/js/countryCodes.json');
                    this.getPostageOptions();
                    this.getRashis();
                    this.resetPayee();
                    this.getCountries();
                },
                async checkLogin() {
                    this.isLoggedIn = true; // TODO: Big security hole   
                    firebase.auth().onAuthStateChanged((authUser) => {
                        if (authUser) {
                            this.isLoggedIn = true;
                            this.user = authUser;
                            this.user.uid = authUser.uid;
                            this.user.isAnonymous = authUser.isAnonymous;
                            this.fetchData();
                        } else {
                            // redirect to login
                            this.isLoggedIn = false;
                            location.href = "/online-services";
                        }
                    });
                },
                formatNumber(value) {
                    value = parseInt(value);
                    return value ? value.toLocaleString("en-IN") : "0";
                },
                maxDateForToDate: "2027-04-06",
                getErrorForToDate() {
                    if (this.newSeva.calendarType == 2 || this.newSeva.calendarType == 3) {
                        return this.newSeva.toDate > this.maxDateForToDate ? "Please select a date before " + this.formatDate(this.maxDateForToDate) : '';
                    }
                },
                async calculateSevaAmount() {
                    if (this.isGuruBhikshavandanamDailyLifetime) {
                        this.newSeva.totalAmount = Math.min(this.newSeva.totalAmount, 2500000);
                    }
                    const toDate = this.newSeva.noEnd ? '9999-12-31' : this.newSeva.toDate;
                    const masaId = this.newSeva.calendarType === 2 ?
                        this.newSeva.fromChandraMasaId :
                        this.newSeva.calendarType === 3 ?
                        this.newSeva.fromSouraMasaId :
                        0;

                    const url = `/api/recurranceCount/${this.newSeva.calendarType || 0}/${this.newSeva.fromDate || ''}/${toDate || ''}/${this.newSeva.type || 0}/${this.newSeva.weekdayId || 0}/${this.newSeva.specificDate || 0}/${this.newSeva.weekdayRepeatId || 0}/${this.newSeva.monthId || 0}/${this.newSeva.fromTithiId || 0}/${this.newSeva.fromNakshatraId || 0}/${masaId || 0}`;
                    if (!this.newSeva.type || !this.newSeva.calendarType || !this.newSeva.fromDate || !toDate ) {
                        // console.log('Waiting for all fields to be selected');
                        return; // gotta wait till we select both things
                    } else {
                        // console.log('we are here');
                        try {
                            const response = await fetch(url);
                            const data = await response.json();
                            this.sevaAmountMultiplication = data.count;
                            if (this.newSeva.type == 1) {
                                const days = data.count;
                                this.postageAmountMultiplication = days < 7 ? 1 : Math.floor(days / 7);
                            } else {
                                this.postageAmountMultiplication = data.count;
                            }
                        } catch (error) {
                            console.error('Error calculating recurrence:', error);
                            // this.getSevaMultiplication();
                        }
                    }


                    // Calculate total amount
                    this.newSeva.totalAmount =
                        this.newSeva.amount * this.sevaAmountMultiplication +
                        this.newSeva.postageCharges * this.postageAmountMultiplication;
                },
                sevaAmountMultiplication: 1,
                postageAmountMultiplication: 1,
                sevaYearsForLifetime: 20,
                
                get isGuruBhikshavandanamDailyLifetime() {
                    if (this.newSeva.dsId == 59 && this.newSeva.noEnd && this.newSeva.type == 1) {
                        return true;
                        // cap total amount to 2500000
                        this.newSeva.totalAmount = Math.min(this.newSeva.totalAmount, 2500000);
                    }
                    return false;
                },
                get newSevaAmount() {
                    if (!this.newSeva.dsId) return 0;
                    return parseInt(this.sevas.find(s => s.id == this.newSeva.dsId)?.price) || 0;
                },
                get newSevaPostageAmount() {
                    if (!this.newSeva.dsId) return 0;
                    return this.newSeva.receivePrasadam ? parseInt(this.newSeva.postageCharges || 0) : 0;
                },
                isLoggedIn: false,
                currentStep: 1,
                getSecondPart() {
                    if (this.selectedSevaType?.id === 3) {
                        if (this.newSeva.sannidhiId && this.newSeva.dsId && this.newSeva.calendarType) {
                            return true;
                        }
                    }
                },
                getThirdPart() {
                    if (this.selectedSevaType?.id !== 3) {
                        return true;
                    }
                    if (this.selectedSevaType?.id === 3) {
                        if (this.newSeva.type === 1) {
                            return true;
                        };
                        if (this.newSeva.type === 2) {
                            if (this.showRecurringSevaField('weekdayId') && this.newSeva.weekdayId) {
                                return true;
                            } else {
                                    // console.log("weekday not selected");
                                    this.newSeva.receivePrasadam = '';
                                    this.newSeva.postageId = '';
                                    this.newSeva.postageCharges = '';
                                    return false;
                            }
                        }

                        if (this.newSeva.type === 3) {
                            // English Calendar
                            if ((this.showRecurringSevaField('specificDate') && this.showRecurringSevaField('weekdayRepeatId'))) {
                                if (this.newSeva.specificDate || (this.newSeva.weekdayId && this.newSeva.weekdayRepeatId)) {
                                    // console.log(this.newSeva.specificDate, this.newSeva.weekdayId, this.newSeva.weekdayRepeatId, "specific date or weekday repeat not selected");
                                    return true;
                                } else {
                                    // console.log("specific date or weekday repeat not selected");
                                    this.newSeva.receivePrasadam = '';
                                    this.newSeva.postageId = '';
                                    this.newSeva.postageCharges = '';
                                    return false;
                                }
                            }
                            // Chandramana and Souramana Calendar
                            if (this.showRecurringSevaField('fromNakshatraId') && this.showRecurringSevaField('fromTithiId') && this.showRecurringSevaField('weekdayId') && this.showRecurringSevaField("weekdayRepeatId") && !this.showRecurringSevaField("fromChandraMasaId") && !this.showRecurringSevaField("fromSouraMasaId")) {
                                if (this.newSeva.fromNakshatraId || this.newSeva.fromTithiId || (this.newSeva.weekdayId && this.newSeva.weekdayRepeatId)) {
                                    // console.log(this.newSeva.fromNakshatraId, this.newSeva.fromTithiId, this.newSeva.weekdayId, this.newSeva.weekdayRepeatId, "CM && SM => monthly");
                                    return true;
                                } else {
                                    // console.log("nakshatra or tithi or weekday combination not selected");
                                    this.newSeva.receivePrasadam = '';
                                    this.newSeva.postageId = '';
                                    this.newSeva.postageCharges = '';
                                    return false;
                                }
                            }

                        }
                        if (this.newSeva.type === 4) { // yearly
                            // console.log("yearly")
                            // handled only english calendar for now
                            if ((this.showRecurringSevaField('specificDate') && this.showRecurringSevaField('weekdayRepeatId') && this.showRecurringSevaField('monthId')) ) {
                                if (this.newSeva.monthId && (this.newSeva.specificDate || (this.newSeva.weekdayId && this.newSeva.weekdayRepeatId))) {
                                    // console.log(this.newSeva.monthId, this.newSeva.specificDate, this.newSeva.weekdayId, this.newSeva.weekdayRepeatId, "specific date or weekday repeat not selected");
                                    return true;
                                } else {
                                    // console.log("EM and specific date or weekday repeat not selected");
                                    this.newSeva.receivePrasadam = '';
                                    this.newSeva.postageId = '';
                                    this.newSeva.postageCharges = '';
                                    // this.newSeva.monthId = '';
                                    this.newSeva.specificDate = '';
                                    return false;
                                }
                            }

                            // Chandramana Calendar
                            if (this.showRecurringSevaField('fromChandraMasaId') && this.showRecurringSevaField('fromNakshatraId') && this.showRecurringSevaField('fromTithiId') && this.showRecurringSevaField('weekdayId') && this.showRecurringSevaField("weekdayRepeatId")) {
                                if (this.newSeva.fromChandraMasaId && (this.newSeva.fromNakshatraId || this.newSeva.fromTithiId || (this.newSeva.weekdayId && this.newSeva.weekdayRepeatId))) {
                                    // console.log(this.newSeva.fromChandraMasaId ,this.newSeva.fromNakshatraId, this.newSeva.fromTithiId, this.newSeva.weekdayId, this.newSeva.weekdayRepeatId, "CM && SM => yearly");
                                    return true;
                                } else {
                                    // console.log("in CM nakshatra or tithi or weekday combination not selected");
                                    this.newSeva.receivePrasadam = '';
                                    this.newSeva.postageId = '';
                                    this.newSeva.postageCharges = '';
                                    return false;
                                }
                            }

                            // Souramana Calendar
                            if (this.showRecurringSevaField('fromSouraMasaId') && this.showRecurringSevaField('fromNakshatraId') && this.showRecurringSevaField('fromTithiId') && this.showRecurringSevaField('weekdayId') && this.showRecurringSevaField("weekdayRepeatId")) {
                                if (this.newSeva.fromSouraMasaId && (this.newSeva.fromNakshatraId || this.newSeva.fromTithiId || (this.newSeva.weekdayId && this.newSeva.weekdayRepeatId))) {
                                    // console.log(this.newSeva.fromSouraMasaId ,this.newSeva.fromNakshatraId, this.newSeva.fromTithiId, this.newSeva.weekdayId, this.newSeva.weekdayRepeatId, "CM && SM => yearly");
                                    return true;
                                } else {
                                    // console.log("in SM nakshatra or tithi or weekday combination not selected");
                                    this.newSeva.receivePrasadam = '';
                                    this.newSeva.postageId = '';
                                    this.newSeva.postageCharges = '';
                                    return false;
                                }
                            }
                        }
                    }
                },
                getFourthPart() {
                    if (this.selectedSevaType?.id === 3) {
                        this.getThirdPart();
                        if (this.newSeva.receivePrasadam == true && this.newSeva.postageId) {
                            return true;
                        } else if (this.receivePrasadam == true && !this.newSeva.postageId) {
                            return false;
                        } else if (this.newSeva.receivePrasadam != '') {
                            return true;
                        }
                    }
                    return true;
                },
                getProceedButton() {
                    if (this.selectedSevaType?.id === 3) {
                        if (this.currentStep == 1) {
                            return this.newSeva.sannidhiId && this.newSeva.dsId && this.newSeva.calendarType && this.newSeva.type && this.newSeva.fromDate && (this.newSeva.noEnd || this.newSeva.toDate) && this.newSeva.fromDate <= (this.newSeva.noEnd ? '9999-12-31' : this.newSeva.toDate);
                        }
                    } else {
                        return true; // For other seva types, always allow proceeding
                    }
                },

                getCurrentDate() {
                    const now = new Date();
                    const day = String(now.getDate()).padStart(2, '0');
                    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
                    const year = now.getFullYear();
                    return `${day}-${month}-${year}`;
                },
                nakshatras: [],
                rashis: [],
                dispRashisMap: {},
                getRashis: async function(nakshatraId, targetObj) {
                    if (nakshatraId) {
                        const selectedNakshatra = this.nakshatras.find(n => n.id == nakshatraId);
                        if (selectedNakshatra) {
                            const arrayOfIds = selectedNakshatra.rashiIds.split(",");
                            this.dispRashisMap[targetObj] = this.rashis.filter(r => arrayOfIds.includes(r.id.toString()));
                            this[targetObj].rashiId = this.dispRashisMap[targetObj]?.[0]?.id || ''; // Select the first rashi by default
                        }
                    } else {
                        const response = await fetch("/api/rashis");
                        this.rashis = await response.json();
                        this.dispRashisMap = {
                            newSeva: this.rashis,
                            newKarta: this.rashis,
                            newPayee: this.rashis
                        };
                    }
                },
                sevaPaid: false,
                showFastlineSevas: false,
                selectedDeity: null,
                sevas: [],
                selectDeity(deity) {
                    this.sevas = [];
                    this.showFastlineSevas = false;
                    this.totalAmount = 0;
                    this.newPayee.deityId = deity.id;
                    this.selectedDeity = deity;
                    this.centres.forEach((d) => {
                        if (d.id !== deity.id && d.sevas) {
                            d.sevas.forEach((seva) => (seva.selected = false));
                        }
                    });
                    this.showFastlineSevas = false;
                    fetch(deity.endpoint)
                        .then((response) => {
                            if (!response.ok) {
                                return Promise.reject(`Failed to fetch sevas for ${deity.name}`);
                            }
                            return response.json();
                        })
                        .then((sevas) => {
                            this.sevas = sevas.map((seva) => ({
                                ...seva,
                                selected: false
                            }));
                            this.showFastlineSevas = true;
                        })
                        .catch((error) => {
                            console.error("Error fetching sevas:", error);
                            alert(`Could not fetch sevas for ${deity.name}. Please try again later.`);
                        });
                    this.calculateTotal();
                },
                toggleSeva(seva) {
                    if (this.selectedDeity.id === 3) {
                        this.sevas.forEach((s) => {
                            if (s.id !== seva.id) s.selected = false;
                        });
                    }
                    seva.selected = !seva.selected;
                    this.calculateTotal();
                },
                handlePostage() {
                    if (event.target.value) {
                        const selected = JSON.parse(event.target.value);
                        this.newSeva.postageCharges = selected.amount;
                        this.newSeva.postageId = selected.id;
                    } else {
                        this.newSeva.postageCharges = '';
                        this.newSeva.postageId = '';
                    }
                    this.calculateSevaTotal();
                },
                calculateSevaTotal() {
                    this.newSeva.totalAmount = this.newSeva.amount + this.newSeva.postageCharges;

                    const selected = this.postageOptions.find(
                        opt => Number(opt.amount) === Number(this.newSeva.postageCharges)
                    );

                    // this.newSeva.postageId = selected ? selected.id : null;
                },

                calculateTotal() {
                    this.totalAmount = this.sevas
                        .filter(seva => seva.selected)
                        .reduce((sum, seva) => sum + parseInt(seva.price || 0), 0);
                },
                addFastlineSeva(_seva, _event) {
                    if (_event.target.type == "checkbox") {
                        if (this.allowOnlyOneSeva) {
                            document.querySelectorAll('.gs').forEach(gs => {
                                if (gs.id != _event.target.id) {
                                    gs.checked = false;
                                }
                            });
                            this.selectedSevas = [];
                        }
                        _event.target.checked == false ?
                            this.selectedSevas = this.selectedSevas.filter(obj => obj.id !== _seva.id) :
                            this.selectedSevas.push(_seva);
                    }
                    this.newPayee.totalAmount = 0;
                    this.calculateTotal();
                },
                fields: [{
                        name: "startDate",
                        mode: ["ps"]
                    },
                    {
                        name: "duration",
                        mode: ["ps"]
                    },
                    {
                        name: "frequentSevas",
                        mode: ["otfs"]
                    },

                    {
                        name: "sevaDate",
                        mode: ["otfs"]
                    },
                    {
                        name: "sannidhiId",
                        mode: ["otfs", "ps", ]
                    },
                    {
                        name: "deitySevaId",
                        mode: ["otfs", "ps", ]
                    },
                    {
                        name: "inAbsentia",
                        mode: ["otfs", "fl"],
                    },
                    {
                        name: "receivePrasadam",
                        mode: ["otfs", "ps"],
                    },

                    // Puduvattu
                    {
                        name: "fromDate",
                        mode: ["ps"],
                    },
                    {
                        name: "toDate",
                        mode: ["ps"],
                    },
                    {
                        name: "noEnd",
                        mode: ["ps"],
                    },
                    // dsId common
                    {
                        name: "calendarType",
                        mode: ["ps"],
                    },
                    {
                        name: "type",
                        mode: ["ps"],
                    },

                    {
                        name: "weekdayRepeatId",
                        mode: ["ps"],
                        calendarType: [1, 2, 3],
                        recurrenceType: [3, 4],
                    },
                    {
                        name: "weekdayId",
                        mode: ["ps"],
                        calendarType: [1, 2, 3],
                        recurrenceType: [2, 3, 4],
                    },
                    {
                        name: "specificDate",
                        mode: ["ps"],
                        calendarType: [1],
                        recurrenceType: [3, 4],
                    },
                    {
                        name: "monthId",
                        mode: ["ps"],
                        calendarType: [1],
                        recurrenceType: [4],
                    },

                    {
                        name: "fromChandraMasaId",
                        mode: ["ps"],
                        calendarType: [2],
                        recurrenceType: [4],
                    },
                    {
                        name: "fromNakshatraId",
                        mode: ["ps"],
                        calendarType: [2, 3],
                        recurrenceType: [3, 4],
                    },
                    {
                        name: "fromTithiId",
                        mode: ["ps"],
                        calendarType: [2, 3],
                        recurrenceType: [3, 4],
                    },

                    {
                        name: "fromSouraMasaId",
                        mode: ["ps"],
                        calendarType: [3],
                        recurrenceType: [4],
                    },

                    {
                        name: "remarks",
                        mode: ["ps"],
                    },

                    // Puduvattu mode. Not sure why it is here
                    {
                        name: "mode",
                        mode: ["ps"],
                    },

                    {
                        name: "devoteeName",
                        mode: ["fl", "otfs"]
                    },
                    {
                        name: "devoteeNameK",
                        mode: ["fl", "otfs"]
                    },
                    {
                        name: "nakshatraId",
                        mode: ["fl", "otfs"]
                    },
                    {
                        name: "rashiId",
                        mode: ["fl", "otfs"]
                    },
                    {
                        name: "city",
                        mode: ["fl", "otfs"]
                    },
                    {
                        name: "cityK",
                        mode: ["fl", "otfs"]
                    },

                    {
                        name: "addresseeName",
                        mode: ["fl", "otfs"]
                    },
                    {
                        name: "addressLine1",
                        mode: ["otfs"]
                    },
                    {
                        name: "addressLine2",
                        mode: ["otfs"]
                    },
                    {
                        name: "landmark",
                        mode: ["otfs"]
                    },
                    {
                        name: "state",
                        mode: ["otfs"]
                    },
                    {
                        name: "country",
                        mode: ["otfs"]
                    },
                    {
                        name: "pincode",
                        mode: ["otfs"]
                    },
                    {
                        name: "mobile",
                        mode: ["fl", "otfs"]
                    },
                    {
                        name: "alternatePhone",
                        mode: ["fl", "otfs"]
                    },

                    {
                        name: "amount",
                        mode: ["fl", "otfs"]
                    },
                    {
                        name: "quantity",
                        mode: ["fl", "otfs"]
                    },
                    {
                        name: "buttons",
                        mode: ["fl", "otfs", "ps"]
                    },
                ],
                showField(_field) {
                    return this.fields.find(f => f.name == _field)?.mode.includes(this.selectedSevaType?.short) ?? false;
                },
                showRecurringSevaField(_id) {
                    if (!this.fields.find(field => field.name == _id).calendarType) {
                        return true;
                    } else {
                        return this.fields.filter(field => field.name == _id)[0]?.calendarType.includes(parseInt(this.newSeva.calendarType)) && this.fields.filter(field => field.name == _id)[0].recurrenceType.includes(parseInt(this.newSeva.type));
                    }
                },
                // Puduvattu
                clearNakshatra() {
                    if (this.newSeva.fromTithiId !== "") {
                        this.newSeva.fromNakshatraId = "";
                        this.newSeva.weekdayId = "";
                        this.newSeva.weekdayRepeatId = "";
                    }
                },
                clearTithi() {
                    if (this.newSeva.fromNakshatraId !== "") {
                        this.newSeva.fromTithiId = "";
                        this.newSeva.weekdayId = "";
                        this.newSeva.weekdayRepeatId = "";
                    }
                },
                clearDropdown() {
                    if (this.newSeva.weekdayId && this.newSeva.weekdayRepeatId) {
                        this.newSeva.specificDate = "";
                        this.newSeva.fromNakshatraId = "";
                        this.newSeva.fromTithiId = "";
                    }
                    this.calculateSevaAmount();
                },
                clearDropdown2() {
                    if (this.newSeva.specificDate) {
                        this.newSeva.weekdayId = "";
                        this.newSeva.weekdayRepeatId = "";
                    }
                },
                getOrdinal(_number) {
                    return _number;
                    let n = _number % 100;
                    let suffix = ["th", "st", "nd", "rd", "th"];
                    let v = n % 10;
                    return n + (suffix[(v - 20) % 10] || suffix[v] || suffix[0]);
                },
                sevaType(_seva) {
                    let final = "";
                    let calendar = this.calendarTypes.filter(c => c.id == _seva.calendarType)[0];
                    let calendarText = calendar?.name + ": ";

                    let recurrence = this.recurrenceTypes.filter(r => r.id == _seva.type)[0]?.id;
                    let recurrenceText = "";
                    if (recurrence == 1) {
                        recurrenceText += "Everyday";
                    } else if (recurrence == 2) {
                        recurrenceText += "Every ";
                        recurrenceText += this.weekdays.filter(w => w.id == _seva.weekdayId)[0]?.name ?? "";
                    } else if (recurrence == 3) {
                        if (calendar.id == 1) {
                            if (_seva.weekdayRepeatId != "") {
                                recurrenceText += this.weekdayRepeats.filter(w => w.id == _seva.weekdayRepeatId)[0]?.name + " ";
                                recurrenceText += this.weekdays.filter(w => w.id == _seva.weekdayId)[0]?.name + " of every month";
                                // console.log("repeat")
                            } else if (_seva.specificDate != "") {
                                recurrenceText += "On " + this.getOrdinal(_seva.specificDate) + " of every month";
                                // console.log("specific")
                            }
                        } else if (calendar.id == 2) {
                            if (_seva.weekdayRepeatId != "") {
                                if (_seva.weekdayId !== "") {
                                    recurrenceText += this.weekdayRepeats.filter(w => w.id == _seva.weekdayRepeatId)[0]?.name + " ";
                                    recurrenceText += this.weekdays.filter(w => w.id == _seva.weekdayId)[0]?.name + " of every month";
                                }
                            } else if (_seva.fromTithiId != "") {
                                recurrenceText += this.tithis.filter(t => t.id == _seva.fromTithiId)[0]?.name;
                                // if (_seva.toTithiId != "" && _seva.toTithiId != _seva.fromTithiId) {
                                //     recurrenceText += " to " + this.tithis.filter(t => t.id == _seva.toTithiId)[0]?.name;
                                // }
                                recurrenceText += " of every month";
                            } else if (_seva.fromNakshatraId != "") {
                                recurrenceText += this.nakshatras.filter(t => t.id == _seva.fromNakshatraId)[0]?.name;
                                // if (_seva.toNakshatraId != "" && _seva.toNakshatraId != _seva.fromNakshatraId) {
                                //     recurrenceText += " to " + this.nakshatras.filter(t => t.id == _seva.toNakshatraId)[0]?.name;
                                // }
                                recurrenceText += " nakshatra of every month";
                            }
                        } else if (calendar.id == 3) {
                            if (_seva.weekdayRepeatId != "") {
                                if (_seva.weekdayId !== "") {
                                    recurrenceText += this.weekdayRepeats.filter(w => w.id == _seva.weekdayRepeatId)[0]?.name + " ";
                                    recurrenceText += this.weekdays.filter(w => w.id == _seva.weekdayId)[0]?.name + " of every month";
                                }
                            } else if (_seva.fromTithiId != "") {
                                recurrenceText += this.tithis.filter(t => t.id == _seva.fromTithiId)[0]?.name;
                                // if (_seva.toSouraTedi != "" && _seva.toSouraTedi != _seva.fromSouraTedi) {
                                //     recurrenceText += " to " + this.getOrdinal(_seva.toSouraTedi);
                                // }
                                recurrenceText += " of every month";
                            } else if (_seva.fromNakshatraId != "") {
                                recurrenceText += this.nakshatras.filter(t => t.id == _seva.fromNakshatraId)[0]?.name;
                                // if (_seva.toNakshatraId != "" && _seva.toNakshatraId != _seva.fromNakshatraId) {
                                //     recurrenceText += " to " + this.nakshatras.filter(t => t.id == _seva.toNakshatraId)[0]?.name;
                                // }
                                recurrenceText += " nakshatra of every month";
                            }
                        }
                    } else if (recurrence == 4) {
                        if (calendar.id == 1) {
                            if (_seva.weekdayRepeatId != "") {
                                if (_seva.weekdayId !== "") {
                                    recurrenceText += this.weekdayRepeats.filter(w => w.id == _seva.weekdayRepeatId)[0]?.name + " ";
                                    recurrenceText += this.weekdays.filter(w => w.id == _seva.weekdayId)[0]?.name + " of " + this.months.filter(m => m.id == _seva.monthId)[0]?.name + " month of every year";
                                }
                            } else if (_seva.specificDate != "") {
                                recurrenceText += this.getOrdinal(_seva.specificDate) + " " + this.months.filter(m => m.id == _seva.monthId)[0]?.name + " of every year";
                            }
                        } else if (calendar.id == 2) {
                            if (_seva.weekdayRepeatId != "") {
                                if (_seva.weekdayId !== "") {
                                    recurrenceText += this.weekdayRepeats.filter(w => w.id == _seva.weekdayRepeatId)[0]?.name + " ";
                                    recurrenceText += this.weekdays.filter(w => w.id == _seva.weekdayId)[0]?.name;
                                }
                                if (_seva.fromChandraMasaId != "") {
                                    recurrenceText += " of " + this.chandraMasas.filter(t => t.id == _seva.fromChandraMasaId)[0]?.name + " masa " + " of every year";
                                }
                            } else if (_seva.fromChandraMasaId != "" && _seva.fromTithiId != "") {
                                recurrenceText += this.chandraMasas.filter(t => t.id == _seva.fromChandraMasaId)[0]?.name;
                                // if (_seva.toChandraMasaId != "" && _seva.toChandraMasaId != _seva.fromChandraMasaId) {
                                //     recurrenceText += " to " + this.chandraMasas.filter(t => t.id == _seva.toChandraMasaId)[0]?.name;
                                // }
                                recurrenceText += " " + this.tithis.filter(t => t.id == _seva.fromTithiId)[0]?.name + " tithi" + " of every year";
                                // if (_seva.toTithiId != "" && _seva.toTithiId != _seva.fromTithiId) {
                                //     recurrenceText += " to " + this.tithis.filter(t => t.id == _seva.toTithiId)[0]?.name;
                                // }
                            } else if (_seva.fromChandraMasaId != "" && _seva.fromNakshatraId != "") {
                                recurrenceText += this.chandraMasas.filter(t => t.id == _seva.fromChandraMasaId)[0]?.name + " ";
                                recurrenceText += this.nakshatras.filter(t => t.id == _seva.fromNakshatraId)[0]?.name + " nakshatra" + " of every year";
                                // if (_seva.toNakshatraId != "" && _seva.toNakshatraId != _seva.fromNakshatraId) {
                                //     recurrenceText += " to " + this.nakshatras.filter(t => t.id == _seva.toNakshatraId)[0]?.name;
                                // }
                            }
                        } else if (calendar.id == 3) {
                            if (_seva.weekdayRepeatId != "") {
                                if (_seva.weekdayId !== "") {
                                    recurrenceText += this.weekdayRepeats.filter(w => w.id == _seva.weekdayRepeatId)[0]?.name + " ";
                                    recurrenceText += this.weekdays.filter(w => w.id == _seva.weekdayId)[0]?.name;
                                }
                                if (_seva.fromSouraMasaId != "") {
                                    recurrenceText += " of " + this.souraMasas.filter(t => t.id == _seva.fromSouraMasaId)[0]?.name + " masa " + " of every year";
                                }
                            } else if (_seva.fromSouraMasaId != "" && _seva.fromTithiId != "") {
                                recurrenceText += this.souraMasas.filter(t => t.id == _seva.fromSouraMasaId)[0]?.name;
                                // if (_seva.toSouraMasaId != "" && _seva.toSouraMasaId != _seva.fromSouraMasaId) {
                                //     recurrenceText += " to " + this.souraMasas.filter(t => t.id == _seva.toSouraMasaId)[0]?.name;
                                // }

                                recurrenceText += " " + this.tithis.filter(t => t.id == _seva.fromTithiId)[0]?.name + " tithi" + " of every year";
                                // recurrenceText += " " + this.getOrdinal(_seva.fromSouraTedi);
                                // if (_seva.toSouraTedi != "" && _seva.toSouraTedi != _seva.fromTithiId) {
                                //     recurrenceText += " to " + this.getOrdinal(_seva.toSouraTedi);
                                // }
                            } else if (_seva.fromSouraMasaId != "" && _seva.fromNakshatraId != "") {
                                recurrenceText += this.souraMasas.filter(t => t.id == _seva.fromSouraMasaId)[0]?.name + " ";
                                recurrenceText += this.nakshatras.filter(t => t.id == _seva.fromNakshatraId)[0]?.name + " nakshatra" + " of every year";
                                // if (_seva.toNakshatraId != "" && _seva.toNakshatraId != _seva.fromNakshatraId) {
                                //     recurrenceText += " to " + this.nakshatras.filter(t => t.id == _seva.toNakshatraId)[0]?.name;
                                // }
                            }
                        }
                    }

                    final += calendarText + " " + recurrenceText;
                    this.newSeva.remarks = final;
                    return final;
                },
                nextStep() {
                    if (this.currentStep < 3) {
                        this.currentStep++;
                    }
                },
                postageOptions: [],
                async getPostageOptions() {
                    this.postageOptions = await this.getData('/api/postageOptions');
                },
                addPostageCharges() {
                    const selectedOption = this.postageOptions.find(po => po.id == this.newSeva.postageOptionId);
                    this.newSeva.postageCharges = parseFloat(selectedOption?.price || 0);
                    this.newSeva.totalAmount = parseFloat(this.newSeva.totalAmount) + parseFloat(this.newSeva.postageCharges);
                },
                prasadamNeeded(_needed) {
                    if (this.newSeva.receivePrasadam == 'true' || this.newSeva.receivePrasadam === true) {
                        if(_needed == 'true' || _needed === true) return;
                    };
                    if (this.newSeva.receivePrasadam == 'false' || this.newSeva.receivePrasadam === false) {
                        if(_needed == 'false' || _needed === false) return;
                    };
                    this.showAddressStep = _needed;
                    this.newSeva.receivePrasadam = _needed;
                    // console.log(this.newSeva.receivePrasadam, "receive Prasadam");
                    // console.log(this.newSeva.postageCharges, "postage charges");
                    // console.log(this.newSeva.postageId, "postage id");
                    const selectedSeva = this.sevas.find(s => s.id == this.newSeva.dsId);
                    const sevaPrice = parseFloat(selectedSeva?.price || 0);
                    const postageCharges = parseFloat(this.newSeva.postageCharges || 0);
                    if (_needed) {
                        this.newSeva.totalAmount = sevaPrice + postageCharges
                    } else if (_needed === false || _needed == 'false') {
                        this.newSeva.postageCharges = 0;
                        this.newSeva.postageOptionId = '';
                        this.newSeva.receivePrasadam = false;
                        this.newSeva.postageId = '';
                        this.newSeva.totalAmount = sevaPrice;
                        // console.log(this.newSeva.receivePrasadam, "receive Prasadam", this.newSeva.postageCharges, "postage charges", this.newSeva.postageId, "postage id");
                    }
                },
                showAddressStep: false,
                sevaSteps: [{
                        id: 1,
                        name: "Seva details",
                        isActive: false
                    },
                    {
                        id: 2,
                        name: "Karta details",
                        isActive: true
                    },
                    {
                        id: 3,
                        name: "Address details",
                        isActive: false
                    },
                ],
                sevaTypes: [{
                        id: 1,
                        short: "fl",
                        name: "Fastline - Seva for Today",
                        description: "Book Live sevas for today and print your receipt at the kiosk if you are attending in person",
                        isActive: false,
                        hasCart: false,
                        isAllowed: false,
                    },
                    {
                        id: 2,
                        short: "otfs",
                        name: "One time Seva (incl. Fastline)",
                        description: "Book sevas for a specific date for attending in person or in absentia and get Prasadam delivered to your home",
                        isActive: true,
                        hasCart: true,
                        isAllowed: true,
                    },
                    {
                        id: 3,
                        short: "ps",
                        name: "Recurring Seva",
                        description: "Book puduvattu seva that is performed on a recurring basis either for Hindu Calendar or English Calendar",
                        isActive: true,
                        hasCart: true,
                        isAllowed: true,
                    },
                ],
                selectedSevaType: null,
                async selectSevaType(_sevaType) {
                    this.home = false;
                    this.validationMessages = [];
                    this.showProfile = false;
                    this.currentStep = 1;
                    this.selectedSevaType = _sevaType;
                    this.sevaTypes.forEach(st => st.isActive = false);
                    this.sevas = [];
                    this.selectedSevas = [];
                    this.showAddressStep = false;
                    this.totalSevaAmount = 0;
                    this.selectedSevaType.isActive = true;
                    this.selectedNav = null;
                    await this.getDeities();
                    this.resetPayee();
                    this.resetSeva();
                    this.hideCalendarPostageChaturmasya = false;
                    // set default values
                    if (_sevaType.short == "fl") {
                        //
                    } else if (_sevaType.short == "otfs") {
                        //
                    } else if (_sevaType.short == "ps") {
                        this.newSeva.inAbsentia = 1;
                    }

                },
                selectSevaHome(_sevaType) {
                    this.home = false;
                    this.selectSevaType(_sevaType);
                },
                newPayee: {},
                resetPayee() {
                    this.newPayee = {
                        name: "",
                        nameK: "",
                        mobile: "",
                        email: "",
                        city: "",
                        cityK: "",
                        deityId: "",
                        nakshatraId: "",
                        rashiId: "",
                        inAbsentia: '',
                        totalAmount: this.totalAmount,
                        sevaTypeId: this.selectedSevaType?.id,
                        selectedSevas: [],
                        uid: this.user.uid,
                    };
                    this.sevaPaid = false;
                    this.selectedDeity = null;
                    this.sevas = [];
                    this.showFastlineSevas = false;
                    this.totalAmount = 0;
                    this.selectedSevas = [];
                    this.totalSevaAmount = 0;
                    this.dispRashis = [];
                },
                // seva selection form
                newSeva: {},
                resetSeva() {
                    this.newSeva = {
                        sannidhiId: "",
                        dsId: "",
                        id: "",
                        inAbsentia: true,
                        receivePrasadam: '',
                        postageCharges: 0,
                        postageId: "",
                        sevaDate: "",

                        // ps
                        fromDate: this.getTomorrowDate(),
                        toDate: "",
                        noEnd: false,
                        calendarType: 0,
                        type: 0,
                        weekdayId: 0,
                        weekdayRepeatId: 0,
                        specificDate: 0,
                        monthId: 0,
                        fromChandraMasaId: 0,
                        fromNakshatraId: 0,
                        fromTithiId: 0,
                        fromSouraMasaId: 0,
                        remarks: "",

                        amount: 0,
                        totalAmount: 0,

                        name: "",
                        nameK: "",
                        gotra: "",
                        gotraK: "",
                        nakshatraId: "",
                        rashiId: "",
                        countryCode: "",
                        mobile: "",

                        addresseeName: "",
                        addressLine1: "", // Street and Area Address
                        addressLine2: "", // Locality
                        landmark: "",
                        countryCode: "",
                        country: "India",
                        pincode: "",
                        state: "",
                        city: "", // Town/Village/City
                        cityK: "",
                        alternatePhone: "",

                        addresseeName: "",
                        addresseeMobile: "",
                        addresseeCountry: "",
                        addresseePincode: "",
                        addresseeState: "",
                        addresseeStreet: "",
                        addresseeLocality: "",
                        addresseeLandmark: "",
                        addresseePlace: "",
                        addresseeDistrict: "",
                        alternatePhone: "",

                        sevaTypeId: this.selectedSevaType?.id,

                        receiptTypeId: 1,
                        branchId: 1,
                    }
                    this.selectedFrequentSevaId = "";
                    this.sevaAmountMultiplication = 1;
                    this.postageAmountMultiplication = 1;
                    this.validationMessages = [];
                    this.searchSannidhi = "";
                    this.searchSeva = "";
                    this.showSevaDropdown = false;
                    this.showSannidhiDropdown = false;
                    this.filteredSevas = [];
                },
                centres: [],
                sannidhis: [],
                searchSannidhi: '', // Search term
                filteredSannidhis: [], // Filtered sannidhis
                async getDeities() {
                    if (this.selectedSevaType?.id === 1) {
                        let response = await fetch("/api/centres");
                        this.centres = await response.json();
                    }
                    let response = await fetch(`/api/online/deities/${this.selectedSevaType?.id}`);
                    this.sannidhis = await response.json();
                    this.filteredSannidhis = this.sannidhis;
                },
                getSannidhiName(_id) {
                    return this.sannidhis?.find(s => s.id == _id)?.name;
                },
                showSannidhiDropdown: false,
                filterSannidhis() {
                    this.showSannidhiDropdown = true;
                    this.showSevaDropdown = false;
                    this.filteredSannidhis = this.sannidhis.filter(sannidhi =>
                        sannidhi.name.toLowerCase().includes(this.searchSannidhi.toLowerCase())
                    );
                },
                async selectSannidhi(sannidhiId) {
                    this.showSannidhiDropdown = false;
                    this.newSeva.sannidhiId = sannidhiId;
                    await this.getDeitySevas();
                    this.newSeva.dsId = '';
                    this.newSeva.postageCharges = '';
                    this.newSeva.postageId = '';
                    this.searchSeva = '';
                    this.newSeva.sevaDate = '';
                },
                showSevaDropdown: false,
                searchSeva: '',
                filteredSevas: [],
                frequentSevas: [],
                async getDeitySevas() {
                    let response = await fetch(`/api/online/deitySevas/${this.newSeva.sannidhiId}/${this.selectedSevaType?.id}`);
                    this.sevas = await response.json();
                    this.filteredsevas = this.sevas;
                    this.searchSannidhi = this.getSannidhiName(this.newSeva?.sannidhiId);
                    this.filteredSannidhis = this.sannidhis;
                },
                filterSevas() {
                    this.showSevaDropdown = true;
                    this.showSannidhiDropdown = false;
                    this.filteredSevas = this.sevas.filter(seva =>
                        seva.name.toLowerCase().includes(this.searchSeva.toLowerCase())
                    );
                },
                async selectSeva(_sevaId) {
                    this.newSeva.dsId = _sevaId;
                    this.newSeva.id = _sevaId;
                    this.getSevaName(_sevaId);
                    this.showSevaDropdown = false;
                    this.filteredSevas = this.sevas;
                    this.getIsChaturmasyaSeva(this.newSeva.dsId);
                    this.newSeva.sevaDate = "";
                    await this.fetchSevaAvailability();
                },
                hideCalendarPostageChaturmasya: false,
                getIsChaturmasyaSeva(_id) {
                    const seva = this.sevas.find(d => d.id == _id);
                    // console.log(seva);
                    if (seva?.postageCharges == 0) {
                        this.hideCalendarPostageChaturmasya = true;
                        this.newSeva.postageCharges = 0;
                        this.newSeva.postageId = '';
                    } else {
                        this.hideCalendarPostageChaturmasya = false;
                    }
                },
                getSevaName(_id) {
                    const seva = this.sevas.find(d => d.id == _id);
                    this.searchSeva = seva ? `${seva.name} - ₹${seva.price}` : "SEVA NAME";
                    return seva ? seva.name : ''; // This is a bit messy and done only to set deitySevaName. Ideally this should be refactored into something better;
                },
                selectedFrequentSevaId: "",
                async setFrequentSeva() {
                    this.home = false;
                    this.validationMessages = [];
                    this.showProfile = false;
                    this.currentStep = 1;
                    this.selectedSevaType = this.sevaTypes[1];
                    this.sevaTypes.forEach(st => st.isActive = false);
                    this.sevas = [];
                    // this.selectedSevas = [];
                    this.showAddressStep = false;
                    //this.totalSevaAmount = 0;
                    this.selectedSevaType.isActive = true;
                    this.selectedNav = null;
                    this.getDeities();

                    
                    let selectedFrequentSeva = this.frequentSevas.find(fs => fs.dsId == this.selectedFrequentSevaId);
                    this.newSeva.sannidhiId = selectedFrequentSeva.deityId;
                    await this.getDeitySevas();
                    this.newSeva.dsId = selectedFrequentSeva.dsId;
                    this.getIsChaturmasyaSeva(this.newSeva.dsId);
                    this.getSevaName(this.newSeva.dsId);
                    this.newSeva.sannidhiName = this.getSannidhiName(this.newSeva.sannidhiId);
                    this.searchSannidhi = this.newSeva.sannidhiName;
                    this.newSeva.sevaDate = "";
                    this.fetchSevaAvailability();
                    //                     this.selectSevaType(this.sevaTypes[1]);
                },
                // here
                 today: new Date(<?= date('Y') ?>, <?= date('n') - 1 ?>, <?= date('j') ?>),
                calendarMonths: [],
                availableDates: [],
                startDay: 0,
                endDay: 90,
                async fetchSevaAvailability() {
                    // console.log(this.newSeva.dsId)
                    if (!this.newSeva.dsId) return;
                    try {
                        const response = await fetch(`https://dssp.lcpl.in/api/online/sevaAvailability/${this.newSeva.dsId}`);
                        const data = await response.json();
                        if (!Array.isArray(data)) {
                            console.error("Expected an array but got:", data);
                            return;
                        }
                        this.availableDates = data;

                        // Preselect logic
                        const availableDates = data.filter(item => item.available === 1);
                        if (availableDates.length === 1) {
                            this.preselectedDate = availableDates[0].date;
                        } else {
                            this.preselectedDate = null;
                        }

                        this.generateCalendar();
                    } catch (error) {
                        console.error("Error fetching Seva availability:", error);
                    }
                },


                generateCalendar() {
                    this.calendarMonths = [];

                    // Helpers—pure JS, no hidden Date parsing
                    function getDaysInMonth(month /*1–12*/, year) {
                      if (month === 2) {
                        // Leap check
                        return ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 29 : 28;
                      }
                      return [4,6,9,11].includes(month) ? 30 : 31;
                    }

                    function getFirstDayOfWeek(day /*1*/, month /*1–12*/, year) {
                      // Zeller’s Congruence → 0=Sunday…6=Saturday
                      if (month < 3) {
                        month += 12; year -= 1;
                      }
                      const K = year % 100;
                      const J = Math.floor(year / 100);
                      const h = (day
                        + Math.floor(13*(month + 1)/5)
                        + K + Math.floor(K/4)
                        + Math.floor(J/4) + 5*J
                      ) % 7;
                      // h=0 → Saturday, so shift:
                      return (h + 6) % 7;
                    }

                    // Normalize “today” to midnight local
                    const today = new Date(
                      this.today.getFullYear(),
                      this.today.getMonth(),
                      this.today.getDate()
                    );

                    // Start at the first of current month
                    let current = new Date(
                      today.getFullYear(),
                      today.getMonth(),
                      1
                    );

                    for (let m = 0; m < 3; m++) {
                      const year  = current.getFullYear();
                      const month = current.getMonth();       // 0–11
                      const month1 = month + 1;               // 1–12

                      const monthName = current.toLocaleString('default', {
                        month: 'long', year: 'numeric'
                      });

                      const daysInMonth   = getDaysInMonth(month1, year);
                      const firstWeekday  = getFirstDayOfWeek(1, month1, year);

                      const monthObj = { name: monthName, days: [] };

                      // Leading blanks
                      for (let b = 0; b < firstWeekday; b++) {
                        monthObj.days.push({ date: '', disabled: true });
                      }

                      // Actual days
                      for (let d = 1; d <= daysInMonth; d++) {
                        // Build YYYY-MM-DD without timezone shenanigans
                        const YYYY = year;
                        const MM   = String(month1).padStart(2,'0');
                        const DD   = String(d).padStart(2,'0');
                        const formattedDate = `${YYYY}-${MM}-${DD}`;

                        // Calculate days from today
                        const dt = new Date(year, month, d);
                        const diff = dt - today;
                        const daysFromToday = Math.floor(diff / (1000*60*60*24));

                        const outOfRange = daysFromToday < this.startDay
                                        || daysFromToday > this.endDay;

                        const avail = this.availableDates.find(x => x.date === formattedDate) || {};
                        const available = avail.available || 0;
                        const dispDate   = avail.dispDate   || '';
                        const dbDate     = avail.date       || '';

                        const isSelected = this.preselectedDate && dbDate === this.preselectedDate;
                        if (isSelected) {
                          this.newSeva.sevaDate = dbDate;
                        }

                        monthObj.days.push({
                          dbDate,
                          dispDate,
                          date:      d,
                          disabled:  outOfRange || available === 0,
                          available,
                          selected:  isSelected
                        });
                      }

                      this.calendarMonths.push(monthObj);
                      // Move to next month
                      current.setMonth(current.getMonth() + 1);
                    }
                  },

                getClass(day) {
                    if (day.selected) return 'bg-green-600 text-white cursor-pointer';
                    if (day.disabled) return 'border border-secondary text-primary-light bg-dark';
                    if (day.available === 0) return 'bg-primary text-secondary cursor-not-allowed';
                    if (day.available > 0) return 'bg-white text-secondary cursor-pointer';
                    return 'cursor-pointer';
                },

                selectSevaDate(day) {
                    // console.log(day)
                    if (day.disabled) return;
                    if (day.available <= 0) {
                        alert('No slots available for this date');
                        return;
                    }
                    
                    this.calendarMonths.forEach(month => {
                        month.days.forEach(d => d.selected = false);
                    });
                    
                    day.selected = true;
                    this.newSeva.sevaDate = day.dbDate;
                    // console.log(day)
                },
                getTomorrowDate() {
                    let today = new Date();
                    today.setDate(today.getDate() + 2);
                    return today.toISOString().split("T")[0];
                },
                endGameToggle() {
                    if (this.newSeva.noEnd) {
                        this.newSeva.toDate = "";
                    } else if (this.newSeva.toDate) {
                        this.newSeva.noEnd = false;
                    }
                    this.calculateSevaAmount();
                },
                placesAPI: {
                    url: "https://api.countrystatecity.in/v1",
                    key: "RmNGRXpqNjVBb2NVRUtiRlVLMW9sRjJDRkVBZjBEM1V6d1pJamRXdg==",
                },
                async getData(url) {
                    var headers = new Headers();
                    headers.append("X-CSCAPI-KEY", this.placesAPI.key);

                    var requestOptions = {
                        method: 'GET',
                        headers: headers,
                        redirect: 'follow'
                    };
                    let response = await fetch(url, requestOptions)
                    let data = await response.json();
                    return data;
                },
                countries: [],
                async getCountries() {
                    this.countries = await this.getData(`${this.placesAPI.url}/countries`);
                },
                filteredCountries: [],
                filterCountries() {
                    this.filteredCountries = this.countries.filter((country) => {
                        return country.name.toLowerCase().includes(this.newSeva.country.toLowerCase());
                    });
                },
                selectedCountry: {},
                setCountry(_country) {
                    this.newSeva.country = _country.name;
                    this.selectedCountry = _country;
                    this.filteredCountries = [];
                    this.getStates(_country.iso2);
                },
                states: [],
                async getStates(_ciso) {
                    this.states = await this.getData(`${this.placesAPI.url}/countries/${_ciso}/states`);
                },
                filteredStates: [],
                filterStates() {
                    this.filteredStates = this.states.filter((state) => {
                        return state.name.toLowerCase().includes(this.newSeva.state.toLowerCase());
                    });
                },
                setState(_state) {
                    this.newSeva.state = _state.name;
                    this.filteredStates = [];
                    this.getCities(this.selectedCountry.iso2, _state.iso2);
                },
                cities: [],
                async getCities(_ciso, _siso) {
                    this.cities = await this.getData(`${this.placesAPI.url}/countries/${_ciso}/states/${_siso}/cities`)
                },
                filteredCities: [],
                filterCities() {
                    this.filteredCities = this.cities.filter((city) => {
                        return city.name.toLowerCase().includes(this.newSeva.city.toLowerCase());
                    });
                },
                setCity(_city) {
                    this.newSeva.city = _city.name;
                    this.filteredCities = [];
                },
                selectedSevas: [],
                totalSevaAmount: 0,

                addSeva() {
                    this.newSeva.mode = 3; // OTFS hard coded. Change it later
                    this.newSeva.sannidhiName = this.getSannidhiName(this.newSeva?.sannidhiId);
                    this.newSeva.deitySevaName = this.getSevaName(this.newSeva.dsId);

                    const selectedSeva = this.sevas.find(s => s.id == this.newSeva.dsId);
                    this.newSeva.amount = this.sevaAmountMultiplication * this.newSevaAmount;
                    this.newSeva.postageCharges = this.postageAmountMultiplication * this.newSevaPostageAmount;
                    if (this.isGuruBhikshavandanamDailyLifetime) {
                        this.newSeva.totalAmount = 2500000;
                        this.newSeva.amount = 2500000;
                        this.newSeva.postageCharges = 0;
                    } else {
                        this.newSeva.totalAmount = parseFloat(this.newSeva.amount) + parseFloat(this.newSeva.postageCharges);
                    }
                    this.selectedSevas.push(this.newSeva);
                    // console.log(this.newSeva, "in PS");
                    this.totalSevaAmount += this.newSeva.totalAmount;
                    this.currentStep = 4;
                    this.resetSeva();
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                },
                removeSeva(index) {
                    this.totalSevaAmount -= this.selectedSevas[index].totalAmount;
                    this.selectedSevas.splice(index, 1);
                },
                isSevaEditing: false,
                async editSevaClick(_seva, _index){
                    this.removeSeva(_index);

                    this.isSevaEditing = true;
                    this.currentStep = 1;
                    await this.selectSannidhi(_seva.sannidhiId);
                    await this.selectSeva(_seva.dsId);
                    this.prasadamNeeded(_seva.receivePrasadam);
                    
                    if (this.selectedSevaType?.id === 2) {
                        // TODO: This is still a bit risky, especially the monthX = ... vala step. If something breaks, immediately check this one
                        const dateSplit = _seva.sevaDate.split("-");
                        let yearX = dateSplit[0];
                        let monthX = this.months.find( m => m.id == Number(dateSplit[1])).name;
                        let dayX = Number(dateSplit[2]);
                        this.calendarMonths.forEach(month => {
                            month.days.forEach(d => {
                                d.selected = month.name == `${monthX} ${yearX}` && d.date == dayX;
                            });
                        });
                    }

                    this.newSeva = _seva;
                },
                isCartOpen: false,
                 formatDate(dateString) {
                  // 1) Parse “YYYY-MM-DD” into numbers:
                  const [year, month, day] = dateString.split("-").map(Number);

                  // 2) Build a LOCAL‐midnight Date (monthIndex is 0–11):
                  const dt = new Date(year, month - 1, day);

                  // 3) Format “DD Mon, YYYY” in en‑GB style:
                  const dayMonth = dt.toLocaleDateString("en-GB", {
                    day:   "2-digit",
                    month: "short"
                  });
                  return `${dayMonth}, ${year}`;
                },
                payeeModal: false,
                validateAndSubmit() {
                    this.validationMessages = [];
                    if (!this.newPayee.name) {
                        this.validationMessages.push("Please enter your name.");
                    }
                    if (!this.newPayee.mobile || !/^\d{10}$/.test(this.newPayee.mobile)) {
                        this.validationMessages.push("Please enter a valid mobile number.");
                    }
                    if (!this.newPayee.city) {
                        this.validationMessages.push("Please enter your city.");
                    }
                    if (!this.selectedDeity) {
                        this.validationMessages.push("Please select a deity.");
                    }
                    if (!this.sevas.some(seva => seva.selected)) {
                        this.validationMessages.push("Please select at least one seva.");
                    }
                    if (this.selectedDeity.id == 1 && this.newPayee.inAbsentia == "") {
                        this.validationMessages.push("Please select if you are booking in absentia.");
                    }
                    if (this.validationMessages.length > 0) {
                        return;
                    }
                    this.submitSevas();
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                },
                validationMessages: [],
                validateStep1() {
                    this.validationMessages = [];

                    if (this.showField('sannidhiId') && !this.newSeva.sannidhiId) {
                        this.validationMessages.push('Please select a sannidhi.');
                    }
                    if (this.showField('deitySevaId') && !this.newSeva.dsId) {
                        this.validationMessages.push('Please select a seva.');
                    }
                    if (this.showField('inAbsentia') && this.newSeva.inAbsentia === '') {
                        this.validationMessages.push('Please select if the seva is performed in absentia or in person.');
                    }
                    if (this.showField('receivePrasadam') && this.newSeva.inAbsentia == 1 && this.newSeva.receivePrasadam === '') {
                        this.validationMessages.push('Please select if you want to receive prasadam via post.');
                    }
                    if (this.showField('receivePrasadam') && (this.newSeva.inAbsentia == 1 && (this.newSeva.receivePrasadam == 'true' || this.newSeva.receivePrasadam === true)) && (!this.newSeva.postageCharges || this.newSeva.postageCharges == '0') && !this.newSeva.postageId) {
                        if (!this.hideCalendarPostageChaturmasya) {
                            this.validationMessages.push('Please select a postage option.');
                        } else {
                            this.newSeva.postageCharges = 0;
                            this.newSeva.postageId = 2;
                        }
                    }
                    if (this.showField('sevaDate') && !this.newSeva.sevaDate) {
                        if (!this.hideCalendarPostageChaturmasya) {
                            this.validationMessages.push('Please select a seva date.');
                        } else {
                            this.newSeva.sevaDate = '2025-07-10';
                        }
                    }
                    if (this.selectedSevaType?.id === 3) {
                        if (this.newSeva.calendarType != 1 && this.getErrorForToDate() != '') {
                            this.validationMessages.push("Please select a valid end date.");
                        }
                        if (this.sevaAmountMultiplication <= 0) {
                            this.validationMessages.push('Please select a valid date range for seva.');
                        }
                        if (this.showRecurringSevaField('fromDate') && !this.newSeva.fromDate) {
                            this.validationMessages.push('Please select a start date.');
                        }
                        if (this.showRecurringSevaField('toDate') && this.showRecurringSevaField('noEnd') && (!this.newSeva.toDate && !this.newSeva.noEnd)) {
                            this.validationMessages.push('Please select either an end date or if the seva has an end date');
                        }
                        if (this.showRecurringSevaField('calendarType') && !this.newSeva.calendarType) {
                            this.validationMessages.push('Please select a calendar type.');
                        }
                        if (this.showRecurringSevaField('type') && !this.newSeva.type) {
                            this.validationMessages.push('Please select a recurrence type.');
                        }
                        // console.log(this.newSeva.type);
                        if (this.newSeva.type == 2) { // if the recurrenceType is weekly then only check this
                            if (this.showRecurringSevaField('weekdayId') && !this.newSeva.weekdayId) {
                                this.validationMessages.push('Please select a weekday.');
                            }
                        }

                        if (this.newSeva.type <= 3) {
                            //  if specific date orrrr weekdayReapeat and weekdayId is not selected then push a validation message
                            if ((this.showRecurringSevaField('specificDate') && this.showRecurringSevaField('weekdayRepeatId'))) {
                                if (!this.newSeva.specificDate && (!this.newSeva.weekdayId || !this.newSeva.weekdayRepeatId)) {
                                    this.validationMessages.push('Please select either a specific date or a weekday and repeat.');
                                }
                            }
                        }
                        if ((this.showRecurringSevaField('specificDate') && this.showRecurringSevaField('weekdayRepeatId'))) {
                            if (!this.newSeva.specificDate && (!this.newSeva.weekdayId || !this.newSeva.weekdayRepeatId)) {
                                this.validationMessages.push('Please select either a specific date or a weekday and repeat.');
                            }
                        }
                        if (this.showRecurringSevaField('monthId') && !this.newSeva.monthId) {
                            this.validationMessages.push('Please select a month.');
                        }
                        if (this.showRecurringSevaField('fromChandraMasaId') && !this.newSeva.fromChandraMasaId) {
                            this.validationMessages.push('Please select a Chandra Masa.');
                        }
                        if (this.showRecurringSevaField('fromNakshatraId') && this.showRecurringSevaField('fromTithiId') && this.showRecurringSevaField('weekdayId') && this.showRecurringSevaField("weekdayRepeatId") && (!this.newSeva.fromNakshatraId && !this.newSeva.fromTithiId && (!this.newSeva.weekdayId || !this.newSeva.weekdayRepeatId))) {
                            this.validationMessages.push('Please select either a Nakshatra or a Tithi or weekday and repeat.');
                        }
                        if (this.showRecurringSevaField('fromSouraMasaId') && !this.newSeva.fromSouraMasaId) {
                            this.validationMessages.push('Please select a Soura Masa.');
                        }
                    }
                    if (this.validationMessages.length > 0) {
                        return;
                    }
                    this.currentStep = 2;
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                },
                validateStep2() {
                    this.validationMessages = [];

                    if (this.selectedSevaType?.id === 2 && this.showField('devoteeName') && this.newSeva.name == '') {
                        this.validationMessages.push("Please enter the devotee's name.");
                    }
                    if (this.selectedSevaType?.id === 3 && this.showRecurringSevaField('devoteeName') && this.newSeva.name == '') {
                        this.validationMessages.push("Please enter the devotee's name.");
                    }
                    if ((this.selectedSevaType?.id === 2 || this.selectedSevaType?.id === 3) && ((this.newSeva.inAbsentia == 1 && !this.newSeva.postageId) || this.newSeva.inAbsentia == 0) && this.newSeva.city == '') {
                        this.validationMessages.push("Please enter the devotee's city.");
                    }
                    if (this.validationMessages.length > 0) {
                        return;
                    }
                    if (this.newSeva.receivePrasadam == 'true') {
                        this.currentStep = 3;
                    } else {
                        this.addSeva();
                    }
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                },
                validateStep3() {
                    this.validationMessages = [];
                    if ((this.selectedSevaType?.id === 2 || this.selectedSevaType?.id === 3) && this.newSeva.receivePrasadam == 'true') {
                        if (!this.newSeva.addresseeName.trim()) {
                            this.validationMessages.push("Please enter the addressee's name.")
                        }
                        if (!this.newSeva.country.trim()) {
                            this.validationMessages.push("Please enter the addressee's country.")
                        }
                        if (!this.newSeva.pincode) {
                            this.validationMessages.push("Please enter the addressee's pincode.")
                        }
                        if (!this.newSeva.state.trim()) {
                            this.validationMessages.push("Please enter the addressee's state.")
                        }
                        if (!this.newSeva.addressLine1.trim()) {
                            this.validationMessages.push("Please enter the street and area address.")
                        }
                        if (!this.newSeva.addressLine2.trim()) {
                            this.validationMessages.push("Please enter the locality.")
                        }
                        if (!this.newSeva.landmark.trim()) {
                            this.validationMessages.push("Please enter the landmark.")
                        }
                        if (!this.newSeva.city.trim()) {
                            this.validationMessages.push("Please enter the town/village/city.")
                        }
                    }
                    if (this.validationMessages.length > 0) {
                        return;
                    }
                    this.addSeva();
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                },
                async submitSevas() {
                    this.validationMessages = [];
                    if (this.selectedSevaType?.id === 2 || this.selectedSevaType?.id === 3) {
                        this.newSeva.name = this.newSeva.name.trim();
                        this.newSeva.addresseePlace = this.newSeva.addresseePlace.trim();
                        this.newSeva.email = this.newSeva.email.trim();
                        if (this.newSeva.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.newSeva.email)) {
                            this.validationMessages.push("Please enter a valid email address.");
                            return;
                        }
                        this.newSeva.addresseeMobile = this.newSeva.addresseeMobile.trim();

                        // Basic empty check
                        if (
                            this.newSeva.name === '' ||
                            this.newSeva.addresseePlace === '' ||
                            this.newSeva.email === '' ||
                            this.newSeva.countryCode === '' ||
                            this.newSeva.addresseeMobile === ''
                        ) {
                            this.validationMessages.push("All the fields are mandatory.");
                            return;
                        }
                        if (
                            this.newSeva.countryCode === '+91' &&
                            (!/^\d{10}$/.test(this.newSeva.addresseeMobile))
                        ) {
                            this.validationMessages.push("Please enter a valid 10-digit mobile number.");
                            return;
                        }
                    }
                    this.sevaPaid = true;
                    this.payeeModal = false;
                    this.isCartOpen = false;
                    let obj;
                    if (this.selectedSevaType.id === 1) {
                        this.newPayee.totalAmount = this.totalAmount;
                        this.newPayee.selectedSevas = this.selectedSevas;
                        this.newPayee.sevaTypeId = this.selectedSevaType.id;
                        this.newPayee.uid = this.user.uid;
                        obj = this.newPayee;
                    } else if (this.selectedSevaType.id === 2) {
                        this.newSeva.totalAmount = this.totalSevaAmount;
                        this.newSeva.selectedSevas = this.selectedSevas;
                        this.newSeva.sevaTypeId = this.selectedSevaType.id;
                        this.newSeva.uid = this.user.uid;
                        obj = this.newSeva;
                    } else if (this.selectedSevaType.id === 3) {
                        this.newSeva.totalAmount = this.totalSevaAmount;
                        this.newSeva.selectedSevas = this.selectedSevas;
                        this.newSeva.sevaTypeId = this.selectedSevaType.id;
                        this.newSeva.uid = this.user.uid;
                        obj = this.newSeva;
                    }
                    // console.log(JSON.stringify(obj));
                    // return;
                    let response = await fetch("/api/online/fl", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(obj),
                    });
                    let data = await response.json();

                    $api_key = 'rzp_live_MXY3nifINw0FJ1';
                    $callback_url = 'https://<?= $_SERVER['HTTP_HOST'] ?>/rpg/onlinesevaresponse';
                    $cancel_url = 'https://<?= $_SERVER['HTTP_HOST'] ?>/sevas-gnr';
                    $image = 'https://<?= $_SERVER['HTTP_HOST'] ?>/assets/logo.jpeg';

                    var options = {
                        key_id: $api_key,
                        name: "Sri Sringeri Sharada Peetham",
                        description: "Payment for Sevas",
                        image: $image,
                        order_id: data.orderId,
                        amount: data.amount,
                        currency: 'INR',
                        prefill: {
                            name: this.newPayee.name,
                            contact: this.newPayee.mobile,
                        },
                        callback_url: $callback_url,
                        cancel_url: $cancel_url,
                    };
                    // create a form 
                    var form = document.createElement("form");
                    form.setAttribute("method", "POST");
                    form.setAttribute("action", "https://api.razorpay.com/v1/checkout/embedded");
                    // form.setAttribute("target", "_blank");
                    form.setAttribute("style", "display:none;");

                    // add fields to the form
                    for (const key in options) {
                        if (options.hasOwnProperty(key)) {
                            const hiddenField = document.createElement("input");
                            hiddenField.setAttribute("type", "hidden");
                            hiddenField.setAttribute("name", key);
                            hiddenField.setAttribute("value", options[key]);
                            form.appendChild(hiddenField);
                        }
                    }
                    // do the prefill fields now
                    const prefill = options.prefill;
                    for (const key in prefill) {
                        if (prefill.hasOwnProperty(key)) {
                            const hiddenField = document.createElement("input");
                            hiddenField.setAttribute("type", "hidden");
                            hiddenField.setAttribute("name", `prefill[${key}]`);
                            hiddenField.setAttribute("value", prefill[key]);
                            form.appendChild(hiddenField);
                        }
                    }
                    // console.log(form);
                    // add the form to the document body
                    document.body.appendChild(form);
                    // submit the form
                    form.submit();
                    // // remove the form
                    document.body.removeChild(form);

                    // var rzp = new Razorpay(options);
                    // rzp.open();

                    // this.resetReceipt();

                    // should we add this here?
                    // this.selectedSevas = [];
                    // this.totalSevaAmount = 0;
                },

                async xt(object, fieldName, kannadaFieldName) {
                    const englishText = object[fieldName];
                    if (!englishText) return ""
                    let response = await this.transliterateG(englishText);
                    object[kannadaFieldName] = response;
                },
                apiKey: 'AIzaSyDZPyhWGWIfsTwguZ2-qVWMMUKY1677I8o',
                sourceLanguage: 'en-IN',
                targetLanguage: 'kn',
                transliterateG: async function(_englishText) {
                    url = `https://translation.googleapis.com/language/translate/v2?key=${this.apiKey}`;
                    try {
                        const response = await fetch(url, {
                            method: 'POST',
                            body: JSON.stringify({
                                q: _englishText,
                                source: this.sourceLanguage,
                                target: this.targetLanguage,
                                format: 'text'
                            }),
                            headers: {
                                "Content-Type": "application/json"
                            }
                        });
                        const result = await response.json();
                        return result.data.translations[0].translatedText;
                    } catch (error) {
                        console.error('Error:', error);
                    }
                },
            };
        };
    </script>
</body>

</html>