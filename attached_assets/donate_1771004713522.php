<?php
$cause = isset($_GET['cause']) ? $_GET['cause'] : "";
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <title>Donation Page</title>
    <script src="/assets/js/tailwind.min.js"></script>
    <script src="/assets/js/alpine.min.js" defer></script>
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
    <!-- noto sans -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap"
        rel="stylesheet">

    <link href="https://fonts.googleapis.com/css?family=Noto Serif" rel="stylesheet" />

    <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
    <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js"></script>
    <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js"></script>

    <script src="/config/firebase.config.js"></script>

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
    </style>
</head>

<body class=" font-noto-sans overflow-x-hidden">
    <!-- page starts here -->
    <div x-data="data()">
        <div class="flex flex-col lg:flex-row overflow-x-hidden">
            <!-- Left Section -->
            <div class="lg:w-[36%] pt-4 md:pt-16 bg-white text-black">
                <div class="flex items-center md:justify-center">
                    <img src="/assets/images/onlineSevaLogo.png" alt="Logo" class="lg:w-[60%] w-[50%] ml-12">
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
                            class="bg-primary py-1 text-center" :class="donationForm.selectedDonations?.length ? '' : 'rounded-b-xl'">
                            <a href="https://onlineservices.sringeri.net/logout"
                                class="flex items-center justify-center justify-center px-4 py-1 text-white">
                                Logout <span class="material-icons text-xs ml-1">power_settings_new</span>
                            </a>
                        </div>

                        <p @click="isCartOpen = true" class="text-center text-[8px] md:text-[10px] lg:text-[12px] font-noto-sans bg-primary-light py-1 rounded-b-xl px-2" x-show="donationForm.selectedDonations?.length">
                            <span class="" x-text="donationForm.selectedDonations ? donationForm.selectedDonations?.length : 0 "></span>
                            Donation(s) Added
                        </p>
                    </button>
                </div>

                <!-- Menu Section (For md+ devices) -->
                <div class="hidden lg:block pl-2 pt-6 lg:pl-52 lg:pt-24">
                    <!-- Loop through menu items dynamically -->
                    <template x-for="(menuItem,idx) in menuItems" :key="menuItem.id">
                        <a :href="menuItem.link" x-show="menuItem.id !== 'viewProfile' || (menuItem.id === 'viewProfile' && !user.isAnonymous)" class="cursor-pointer transition-all duration-300 text-xl"
                            :class="menuItem.id === 'makeDonation' ? 'text-primary font-bold italic' : 'text-primary-light w-3/4'">
                            <div class="flex items-center">
                                <span class="font-noto-serif">
                                    <span x-text="menuItem.name"></span>
                                </span>
                                <span class="material-icons ml-4" x-show="menuItem.id === 'makeDonation'">arrow_forward</span>
                            </div>
                            <div class="border-b-2 my-6" x-show="(user?.isAnonymous && idx < 2) || (!user?.isAnonymous && idx < 3)"
                                :class="menuItem.id === 'makeDonation' ? 'border-primary' : 'border-primary-light w-[65%]'"></div>
                        </a>
                    </template>
                </div>

                <!-- Menu Section (For Mobile Screens Only) -->
                <div class="relative block lg:hidden w-full px-4 mt-6" x-data="{ centerActiveNav() {
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
                                class="cursor-pointer text-lg py-1 flex-shrink-0 transition-all px-4 py-3 rounded-lg"
                                :class="menuItem.id === 'makeDonation' ? 'active-nav text-primary font-semibold italic bg-white' : 'text-primary-light'">
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
                <div x-show="!home" class="relative block lg:hidden w-full px-4 mt-4" x-data="{ centerActiveNav() {
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

                        <template x-for="donationHeading in donationHeadings" :key="donationHeading.id">
                            <div @click="selectDonationHeading(donationHeading); centerActiveNav();"
                                class="cursor-pointer text-lg py-1 flex-shrink-0 transition-all px-10"
                                :class="selectedDonationHeading?.id === donationHeading?.id ? 'active-nav text-primary font-semibold italic' : 'text-primary-light'">
                                <span x-text="donationHeading.name"></span>
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
                <!-- sticky cart laptop -->
                <div class="relative lg:h-60 md:h-20">
                    <!-- Cart Icon -->
                    <div class="hidden lg:block absolute top-5 lg:top-24 right-4 lg:right-24 z-200">
                        <button
                            class="text-gray-200 bg-dark rounded-xl text-xs relative">
                            <div @click="showLogout = !showLogout" @click.away="showLogout = false" class="flex items-center justify-between px-2 font-noto-serif italic py-2">
                                <p class="pl-1">Namaste <br> <span x-text="user.name"></span></p>
                                <span class="material-icons" x-text="showLogout ? 'keyboard_arrow_up' : 'keyboard_arrow_down'"></span>
                            </div>

                            <div x-show="showLogout" x-transition
                                class="bg-white py-1 text-center" :class="donationForm.selectedDonations?.length ? '' : 'rounded-b-xl'">
                                <a href="https://onlineservices.sringeri.net/logout"
                                    class="flex items-center justify-center justify-center px-4 py-2 text-primary">
                                    Logout <span class="material-icons text-sm ml-1">power_settings_new</span>
                                </a>
                            </div>

                            <p @click="isCartOpen = true" class="text-center text-[8px] md:text-[10px] lg:text-[12px] font-noto-sans bg-primary-light py-2 rounded-b-xl px-2" x-show="donationForm.selectedDonations?.length">
                                <span class="" x-text="donationForm.selectedDonations ? donationForm.selectedDonations?.length : 0 "></span>
                                Donation(s) Added
                            </p>

                            <div class="absolute bg-white rounded-full h-6 w-6 -top-2 -left-2"></div>
                        </button>
                    </div>

                    <!-- Cart Modal -->
                    <div x-show="isCartOpen"
                        @click.away="isCartOpen = false; document.body.classList.remove('no-scroll')"
                        x-init="$watch('isCartOpen', value => value ? document.body.classList.add('no-scroll') : document.body.classList.remove('no-scroll'))"
                        class="fixed inset-0 z-50" x-cloak>
                        <!-- overlay -->
                        <div class="inset-0 fixed bg-black/20 backdrop-blur-sm"></div>
                        <!-- Modal -->
                        <div class="fixed inset-0 lg:w-[60%] lg:mx-auto py-12">
                            <div
                                class="bg-white mx-2 lg:ml-4 lg:mr-0 rounded-2xl shadow-xl relative text-primary modal-content max-h-[90%] my-16 overflow-y-scroll">
                                <button @click="isCartOpen = false"
                                    class="absolute text-3xl top-5 right-7 text-primary">
                                    &times;
                                </button>
                                <h2 class="text-2xl font-noto-serif italic font-semibold text-center pt-16">
                                    Added Donations</h2>
                                <div class="md:px-12 lg:px-20">
                                    <p x-show="donationForm.selectedDonations?.length == 0" class=" text-center mt-6">Please Select a Donation First.
                                    </p>
                                    <div class="my-12 mx-4 md:mx-6 lg:mx-8">
                                        <template x-for="(donation, index) in donationForm.selectedDonations" :key="index">
                                            <div class="pt-8">
                                                <div class="flex items-center justify-between">
                                                    <div class="flex space-x-2">
                                                        <div class="rounded-full bg-primary-light text-white w-9 h-9 flex flex-none items-center justify-center font-semibold"
                                                            x-text="index +1"></div>
                                                        <div class="flex flex-col text-sm pl-4">
                                                            <div class="text-left">
                                                                <p class="font-semibold"
                                                                    x-text="donation.donationName">
                                                                </p>
                                                                <p>
                                                                    <span x-text="donation.is80G == 0 ? donation.subcategoryName + ' (non-80G)' : donation.subcategoryName"></span>
                                                                    <span
                                                                        x-text="` - ₹ `"></span>
                                                                    <span
                                                                        x-text="formatNumber(donation.donationAmount)"></span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="flex flex-col text-md items-between">
                                                        <p
                                                            class="font-noto-serif text-xl text-right font-semibold">
                                                            <span x-text="`₹ `"></span> <span
                                                                x-text="formatNumber(donation.donationAmount)"></span>
                                                        </p>
                                                        <button
                                                            class="mt-10 uppercase bg-white text-primary border border-primary rounded-md text-sm px-4 py-1 font-noto-sans"
                                                            @click="removeDonation(index)">Remove</button>
                                                    </div>
                                                </div>
                                                <div class="border-b border-primary mt-6"></div>
                                            </div>
                                        </template>
                                        <div class="flex justify-between space-x-4 md:space-x-0 mt-16">
                                            <button
                                                class="mb-16 rounded-md py-2 md:py-6 text-lg text-primary bg-white border border-primary md:w-2/5"
                                                @click="isCartOpen = false; currentStep = 1;">
                                                + Add Another Donation</button>
                                            <button
                                                class="mb-16 rounded-md py-2 md:py-6 text-lg text-white bg-dark md:w-2/5"
                                                @click="payeeModal = true; isCartOpen = false;">Proceed to
                                                pay ₹<span x-text="formatNumber(donationForm.totalAmount)"></span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="fixed inset-0 z-20" x-cloak x-show="posterPopup">
                    <!-- Overlay -->
                    <div class="inset-0 fixed bg-black/20 backdrop-blur-md"></div>

                    <!-- Modal -->
                    <div class="fixed inset-0 md:w-[70%] md:mx-auto mt-20 md:mt-0 flex items-center justify-center">
                        <div @click.away="posterPopup = false" class="bg-white rounded-lg shadow-lg overflow-auto max-h-[90vh] w-full p-6 md:p-12 relative">
                            <!-- Close Button -->
                            <button @click="posterPopup = false" class="absolute top-4 right-4 text-3xl text-secondary hover:text-gray-900">
                                &times;
                            </button>

                            <!-- Modal Content -->
                            <div class="flex flex-col items-center text-center space-y-4">
                                <!-- Image -->
                                <img
                                    :src="selectedDonationHeading?.id == 2 ? '/assets/images/savmh-poster.jpg' : 
                          selectedDonationHeading?.id == 3 ? '/assets/images/kashmir-poster.jpg' : ''"
                                    :alt="selectedDonationHeading?.name ? selectedDonationHeading?.name : ''"
                                    class="mx-6 md:mx-20 md:w-full object-contain rounded-lg">
                                <p class="text-primary text-md mx-6 md:mx-20 text-left" x-html="selectedDonationHeading?.about"></p>
                                <button
                                    x-show="home"
                                    @click="selectDonationHeading(selectedDonationHeading); posterPopup = false"
                                    class="bg-primary text-white px-6 py-2 rounded-xl my-6">Pick this cause
                                    <span class="material-icons text-sm ml-2">arrow_forward</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div x-show="home" class="lg:ml-20 lg:mr-32 md:mx-12">
                    <div class="text-white p-4">
                        <div class="mt-12x md:mt-0">This portal is meant for Donations to various causes. Sevas like Archane or Bhikshavandanam etc, can be booked using <span class="bg-secondary py-1/2 italic text-white rounded-full px-1"><a href="/online-seva">"Book a Seva"</a></span> menu within the portal.</div>
                        <div class="md:mr-12x">
                            <h1 class="text-center text-lg font-semibold font-noto-serif mt-8 md:my-6">Choose a Donation Center</h1>
                            <div class="grid grid-cols-1 md:grid-cols-2 md:gap-16 mb-16">
                                <template x-for="donationHeading in donationHeadings" :key="donationHeading.id">
                                    <div class="rounded-lg mt-4 h-52x shadow-md bg-cover bg-center relative"
                                        :style="'background-image: url(' + getBgImage(donationHeading.id) + ');'">

                                        <!-- Gradient Overlay -->
                                        <div class="absolute inset-0 bg-white opacity-80 rounded-lg"></div>

                                        <div class="relative flex flex-col justify-between h-full p-6">

                                            <div class="">
                                                <div class="flex w-full justify-between">
                                                    <h3 class="text-primary font-semibold italic text-xl font-noto-serif w-full z-10 text-left w-2/3" x-text="donationHeading.name"></h3>
                                                    <button x-show="donationHeading?.id != 1" class="bg-primary text-white opacity-70 px-2 py-1 rounded-md mb-2 text-xs shadow-xl" @click="selectPoster(donationHeading)">Know More</button>
                                                </div>

                                                <p class="text-primary text-sm md:text-base font-bold font-noto-serif mt-2 w-full z-10 text-left w-full" x-text="donationHeading.shortDescription"></p>
                                            </div>

                                            <div class="flex flex-col items-start z-10 mt-12">
                                                <button @click="selectDonationHeading(donationHeading)"
                                                    class="bg-primary text-white px-4 py-2 rounded-xl">Pick this cause
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
                    <div class="hidden lg:block ml-24 mr-36 mt-8">
                        <div class="grid grid-cols-4">
                            <template x-for="donationHeading in donationHeadings" :key="donationHeading.id">
                                <button @click="selectDonationHeading(donationHeading)"
                                    class="transition-all duration-300 text-xs uppercase py-3 font-semibold"
                                    :class="selectedDonationHeading?.id === donationHeading.id ? 'border border-transparent bg-white text-primary roundedx' : 'bg-dark text-primary border border-secondary'">
                                    <div class="text-center">
                                        <span x-text="donationHeading.name" class=""></span>
                                    </div>
                                </button>
                            </template>
                        </div>
                    </div>
                    <!-- Navigation till here -->
                    <div x-show="selectedDonationHeading" class="lg:ml-20 mt-12 lg:mr-32 md:mx-12">

                        <!-- Donation Form -->
                        <div class="pl-4 pr-4 pb-2">
                            <!-- Dynamic Content Container -->
                            <div>
                                <div x-show="currentStep == 1">
                                    <div class="flex items-center justify-center">
                                        <button x-show="selectedDonationHeading?.id != 1" class="bg-gray-200 text-primary px-2 py-1 rounded-md mb-12 text-xs" @click="posterPopup = true">Know More About this Cause</button>
                                    </div>
                                </div>
                                <!-- Donation Form Content -->
                                <template x-if="currentStep === 1" class="">
                                    <div class="font-noto-serif bg-white px-4 md:px-12 lg:px-20 py-8 lg:py-12 rounded-lg shadow-md my-2 mb-16 ">


                                        <!-- Warning Popup (Hidden by Default) -->
                                        <div x-show="showClaim80GPopup"
                                            class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center">
                                            <div class="bg-white rounded-lg p-6 w-96 shadow-lg">
                                                <h2 class="text-lg font-bold text-primary mb-4">Warning</h2>
                                                <p class="text-sm text-primary-light">
                                                    Changing the 80G preference will reset your donation basket. Do you want to proceed?
                                                </p>
                                                <div class="mt-6 flex justify-end space-x-4">
                                                    <button @click="cancelClaim80GChange"
                                                        class="px-4 py-2 bg-gray-300 text-primary rounded-lg">
                                                        No
                                                    </button>
                                                    <button @click="confirmClaim80GChange"
                                                        class="px-4 py-2 bg-primary text-white rounded-lg">
                                                        Yes
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- donation section -->
                                        <div class="mb-6 mt-12">
                                            <!-- Dropdown Trigger -->
                                            <button @click="showCategories = !showCategories"
                                                class="w-full text-primary text-xs flex justify-between items-center ml-1">
                                                <span x-text="selectedCategory ? selectedCategory.name : 'Choose Donation'"
                                                    :class="selectedCategory ? 'font-semibold text-sm' : 'text-sm'"></span>
                                                <span class="material-icons"
                                                    x-text="showCategories ? 'expand_less' : 'expand_more'"></span>
                                            </button>

                                            <!-- Dropdown Content -->
                                            <div x-show="showCategories" class="mb-6 space-y-2 pl-1">
                                                <!-- Buttons for Donation Categories -->
                                                <div class="flex flex-wrap items-center space-y-3 font-noto-sans">
                                                    <template x-for="category in selectedDonationCategories"
                                                        :key="category.id">
                                                        <button @click="selectCategory(category)"
                                                            :class="selectedCategory && selectedCategory.id === category.id ? 'bg-primary text-white' : 'border-primary-light text-primary bg-white'"
                                                            class="border rounded-md px-4 py-1 mr-2 text-sm font-semibold text-center hover:bg-[#98649D] hover:text-white"
                                                            x-text="category.name"></button>
                                                    </template>
                                                </div>
                                            </div>
                                            <div class="border-b border-primary mt-1"></div>
                                        </div>

                                        <!-- Donation Subcategory Section (Improved UI) -->
                                        <div class="mb-6 mt-12" x-show="selectedCategory">
                                            <!-- Dropdown Trigger -->
                                            <button @click="selectedCategory ? (showSubCategories = !showSubCategories) : alert('Please select a category first')"
                                                class="w-full text-primary text-xs flex justify-between items-center text-left pl-1">
                                                <span x-text="selectedSubCategory 
                                                    ? `${selectedSubCategory.name} - ₹ ${formatNumber(selectedAmount || customAmount || 0)}`
                                                    : 'Choose Donation Category'"
                                                    :class="(selectedSubCategory && (selectedAmount || customAmount)) ? 'font-semibold text-sm' : 'text-left text-sm'">
                                                </span>
                                                <span class="material-icons" x-text="showSubCategories && selectedCategory ? 'expand_less' : 'expand_more'"></span>
                                            </button>

                                            <!-- Dropdown Content -->
                                            <div x-show="showSubCategories && selectedCategory" class="mb-6 mt-8 space-y-2">
                                                <!-- Left Section: Subcategory Pills & Description -->
                                                <div class="">
                                                    <!-- Pills for each subcategory -->
                                                    <div class="flex flex-wrap gap-2 mr-2 mt-2">
                                                        <template x-for="subcategory in subcategories" :key="subcategory.id">
                                                            <button @click="handleSubCategoryClick(subcategory)"
                                                                class="cursor-pointer transition-all duration-300 text-sm font-noto-serif px-4 py-2 rounded-md"
                                                                :class="selectedSubCategory?.id === subcategory?.id 
                                                                    ? 'bg-primary text-white' 
                                                                    : 'bg-white text-primary border border-primary-light hover:bg-[#98649D] hover:text-white'">
                                                                <span x-text="subcategory.is80G == 0 ? subcategory.name + ' (non-80G)' : subcategory.name"></span>
                                                            </button>
                                                        </template>
                                                    </div>
                                                </div>
                                                <!-- Error Message (Appears below subcategories if there’s an issue) -->
                                                <p x-show="showError && errorSubcategoryId" class="text-red-600 text-sm mt-1">
                                                    Donation for 80G & Non-80G causes cannot be added in a single transaction due to statutory reasons.
                                                </p>

                                                <div class="flex items-center justify-center">
                                                    <div class="bg-[#E9E9E9] text-primary rounded-md mt-4 md:w-[75%] w-full" x-show="selectedSubCategory">
                                                        <p class="text-sm text-primary italic bg-[#E9E9E9] px-4 py-2 rounded-md">
                                                            <span class="font-semibold">Description:</span> <span x-text="selectedSubCategory?.desc"></span>
                                                        </p>

                                                        <div class="flex flex-col items-center md:items-start space-y-2 my-4">
                                                            <div class="pt-3 text-xs text-center py-2 mx-4 px-8 font-noto-serif">Choose Amount</div>
                                                            <!-- Amount Options -->
                                                            <template x-for="amount in selectedSubCategory?.amountOptions || []" :key="amount">
                                                                <div @click="selectAmount(amount); showSubCategories = false;"
                                                                    class="rounded cursor-pointer text-center py-2 mx-4 px-12"
                                                                    :class="selectedAmount === amount ? 'bg-primary text-white font-semibold rounded-md ' : 'text-primary hover:bg-[#98649D] hover:text-white font-semibold hover:rounded-md hover:mx-4'">
                                                                    <span x-text="`₹ ${formatNumber(amount)}`"></span>
                                                                </div>
                                                            </template>
                                                            <!-- Custom Amount Input -->
                                                            <div x-show="selectedSubCategory?.anyAmount" class="mt-2">
                                                                <input type="number"
                                                                    x-model="customAmount"
                                                                    @blur="applyCustomAmount()"
                                                                    @keydown.enter="applyCustomAmount()"
                                                                    placeholder="Enter another amount"
                                                                    class="my-2 ml-4 w-full text-[10px] border border-primary rounded-md p-2 placeholder:text-[#7C3A59]/60" />
                                                            </div>

                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="border-b border-primary mt-1"></div>
                                        </div>

                                        <div class="relative" x-show="newDonation.donationAmount">
                                            <input type="text" x-model="newDonation.donationInTheNameOf"
                                                placeholder="Donation in the name of" class="text-sm placeholder:text-[#98649D] text-primary w-full border-primary text-sm focus:outline-none border-l-0 border-r-0 border-t-0 py-2 md:mt-4 focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 text-primary px-1">
                                            <button class="text-right w-full text-sm text-primary underline absolute top-5 md:top-6 right-0"
                                                @click="showKartaList = !showKartaList; fetchKartas()">+ Pick karta from list
                                            </button>
                                            <div class="w-full text-sm p-4 rounded-lg shadow-lg"
                                                x-show="showKartaList" @click.away="showKartaList = false">
                                                <!-- <h2 class="text-lg font-semibold mb-2 ml-2 text-primary">Kartas</h2> -->
                                                <template x-for="kartaRef in user.kartas">
                                                    <button
                                                        class="flex items-start space-x-2 cursor-pointer w-full hover:bg-[#98649D80] p-2 rounded-lg"
                                                        @click="selectKarta(kartaRef)">
                                                        <p class="w-full text-left text-sm text-primary font-semibold"
                                                            x-text="kartaRef.name"></p>
                                                    </button>
                                                </template>
                                            </div>
                                        </div>

                                        <div x-show="selectedSubCategory?.hasDonationDate == 1">
                                            <div class="mt-10">
                                                <label for="calendarType"
                                                    class="text-primary text-sm ml-1 pl-1">Donation Date</label>
                                                <div class="flex flex-wrap space-x-2 space-y-2">
                                                    <template x-for="calendarType in calendarTypes"
                                                        :key="calendarType.id">
                                                        <button
                                                            class="text-sm rounded-full px-4 py-2 shadow"
                                                            :class="newDonation.calendarType == calendarType.id ? 'bg-secondary text-white' : 'bg-primary-light text-white'"
                                                            @click="newDonation.calendarType = calendarType.id"
                                                            x-text="calendarType.name"></button>
                                                    </template>
                                                </div>
                                            </div>

                                            <div class="mt-6">
                                                <div class="mb-6">
                                                    <!-- month selection -->
                                                    <div class=""
                                                        x-show="newDonation.calendarType == 1">
                                                        <label for="month" class=""></label>
                                                        <select x-model="newDonation.monthId" id="month"
                                                            class="text-sm text-left w-full border-0 text-primary appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-primary text-primary px-1 pl-1">
                                                            <option value="">Select a month</option>
                                                            <template x-for="month in months" :key="month.id">
                                                                <option :value="month.id" x-text="month.name"
                                                                    :selected="month.id == newDonation.monthId">
                                                                </option>
                                                            </template>
                                                        </select>
                                                        <div class="ml-1 border-b border-primary mr-2">
                                                        </div>
                                                    </div>

                                                    <!-- chandraMasa -->
                                                    <div class=""
                                                        x-show="newDonation.calendarType == 2">
                                                        <label for="chandraMasa" class=""></label>
                                                        <select x-model="newDonation.fromChandraMasaId"
                                                            id="chandraMasa"
                                                            class="text-sm text-left w-full border-0 text-primary appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-primary text-primary px-1 pl-1">
                                                            <option value="">Select a masa</option>
                                                            <template x-for="chandraMasa in chandraMasas"
                                                                :key="chandraMasa.id">
                                                                <option :value="chandraMasa.id"
                                                                    x-text="chandraMasa.name"
                                                                    :selected="chandraMasa.id == newDonation.fromChandraMasaId">
                                                                </option>
                                                            </template>
                                                        </select>
                                                        <div class="ml-1 border-b border-primary mr-2">
                                                        </div>
                                                    </div>

                                                    <!-- souramasa -->

                                                    <div class=""
                                                        x-show="newDonation.calendarType == 3">
                                                        <label for="souraMasa" class=""></label>
                                                        <select x-model="newDonation.fromSouraMasaId" id="souraMasa"
                                                            class="text-sm text-left w-full border-0 text-primary appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-primary text-primary px-1 pl-1">
                                                            <option value="">Select a masa</option>
                                                            <template x-for="souraMasa in souraMasas"
                                                                :key="souraMasa.id">
                                                                <option :value="souraMasa.id"
                                                                    x-text="souraMasa.name"
                                                                    :selected="souraMasa.id == newDonation.fromSouraMasaId">
                                                                </option>
                                                            </template>
                                                        </select>
                                                        <div class="ml-1 border-b border-primary mr-2">
                                                        </div>
                                                    </div>
                                                </div>

                                                <!-- date / tithi / nakshatra -->
                                                <div>
                                                    <div class="bg-primary-light p-4 rounded-md mb-4"
                                                        x-show="newDonation.calendarType == 1">
                                                        <label for="specificDate" class=""></label>
                                                        <select x-model="newDonation.specificDate" id="specificDate"
                                                            class="text-sm text-left w-full border-0 text-primary appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-primary text-primary px-1 pl-1">
                                                            <option value="">Select a Date</option>
                                                            <template
                                                                x-for="number in [...Array(31).keys()].map(i => i + 1)"
                                                                :key="number">
                                                                <option :value="number" x-text="number"
                                                                    :selected="number == newDonation.specificDate">
                                                                </option>
                                                            </template>
                                                        </select>
                                                        <div class="ml-1 border-b border-primary mr-2">
                                                        </div>
                                                    </div>

                                                    <div class="bg-primary-light p-4 rounded-md mb-4"
                                                        x-show="newDonation.calendarType == 2 || newDonation.calendarType == 3">
                                                        <label for="tithi" class=""></label>
                                                        <select x-model="newDonation.fromTithiId" id="tithi"
                                                            @change="clearNakshatra()"
                                                            class="text-sm text-left w-full border-0 text-primary appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-primary text-primary px-1 pl-1">
                                                            <option value="">Select a Tithi</option>
                                                            <template x-for="tithi in tithis" :key="tithi.id">
                                                                <option :value="tithi.id" x-text="tithi.name"
                                                                    :selected="tithi.id == newDonation.fromTithiId">
                                                                </option>
                                                            </template>
                                                        </select>
                                                        <div class="ml-1 border-b border-primary mr-2">
                                                        </div>
                                                    </div>

                                                    <div class="bg-primary-light p-4 rounded-md mb-4"
                                                        x-show="newDonation.calendarType == 2 || newDonation.calendarType == 3">
                                                        <label for="nakshatra" class=""></label>
                                                        <select x-model="newDonation.fromNakshatraId" id="nakshatra"
                                                            @change="clearTithi()"
                                                            class="text-sm text-left w-full border-0 text-primary appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-primary text-primary px-1 pl-1">
                                                            <option value="">Select a Nakshatra</option>
                                                            <template x-for="nakshatra in nakshatras"
                                                                :key="nakshatra.id">
                                                                <option :value="nakshatra.id"
                                                                    x-text="nakshatra.name"
                                                                    :selected="nakshatra.id == newDonation.fromNakshatraId">
                                                                </option>
                                                            </template>
                                                        </select>
                                                        <div class="ml-1 border-b border-primary mr-2">
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div x-show="newDonation.donationAmount">
                                            <div class="flex items-center justify-between mt-8">
                                                <input type="text" x-model="newDonation.donationRemarks"
                                                    placeholder="Remarks (Optional)"
                                                    class="text-sm placeholder:text-[#98649D] text-primary w-full border-primary text-sm focus:outline-none border-l-0 border-r-0 border-t-0 py-2 md:mt-4 focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 text-primary px-1">
                                            </div>
                                        </div>

                                        <!-- upload image where subcategory has a 'hasUpload' in it -->
                                        <div x-show="selectedSubCategory?.hasUpload == 1" class="py-4 text-primary">
                                            <div class="">
                                                <h1 class="text-sm">Upload Event Invitation / Image</h1>
                                                <!-- Upload Form -->
                                                <form @submit.prevent="uploadImages($refs.files.files)" class="">
                                                    <input @change="uploadImages($refs.files.files)" name="files[]" type="file" x-ref="files" class="ml-1 mt-1 rounded-md text-xs">
                                                    <span x-text="!uploading && uploaded ? '&#9989;' : ''"></span>
                                                    <p class="hidden">Allowed file types: jpg, jpeg, png, gif, webp, doc, docx, pdf</p>
                                                    <button class="text-white px-6 py-2 rounded-md uppercase hidden" :disabled="uploading" :class="uploading ? 'bg-gray-500' : 'bg-blue-500'" x-text="uploading ? 'Uploading...' : 'Upload'"></button>
                                                </form>
                                            </div>
                                        </div>

                                        <!-- Validation Messages -->
                                        <div x-show="validationMessages.length"
                                            class="text-red-500 text-sm text-center mt-12">
                                            <template x-for="message in validationMessages" :key="message">
                                                <p x-text="message"></p>
                                            </template>
                                        </div>

                                        <!-- Proceed Button -->
                                        <div class="flex items-center justify-center mt-14 mb-5">
                                            <button @click="handleProceed()"
                                                :class="!isStep1Valid ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#4D2B3F] cursor-pointer'"
                                                class="font-noto-sans text-white uppercase py-3 px-6 md:px-12 lg:px-16 rounded-lg text-md">
                                                Proceed <span class="ml-8 material-icons text-[18px]">arrow_forward</span>
                                            </button>
                                        </div>

                                        <!-- Confirmation Popup -->
                                        <div x-show="showConfirmPopup" class="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
                                            <div class="bg-white w-[50%] p-6 rounded shadow-lg text-center">
                                                <p class="text-lg mb-4 text-primary">
                                                    Donation for 80G & Non-80G causes cannot be added in a single transaction due to statutory reasons.
                                                    Do you want to replace your existing basket with this donation?
                                                </p>
                                                <div class="flex justify-center space-x-4 mt-8">
                                                    <button @click="cancelReplaceBasket" class="bg-gray-300 text-primary px-4 py-2 rounded">
                                                        Cancel
                                                    </button>
                                                    <button @click="confirmReplaceBasket" class="bg-primary text-white px-4 py-2 rounded">
                                                        Yes, Replace
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </template>
                            </div>

                            <!-- Step 2 listing the donations -->
                            <div>
                                <template x-if="currentStep === 2">
                                    <div class="font-noto-serif text-white">
                                        <h2 class=" font-noto-sans text-center font-semibold text-xl">
                                            Selected Donations</h2>
                                        <div class="md:px-20">
                                            <template x-if="donationForm.selectedDonations?.length === 0">
                                                <p class="text-gray- text-center mt-6">Please Select a Donation First.
                                                </p>
                                            </template>
                                            <div class="my-12">
                                                <template x-for="(donation, index) in donationForm.selectedDonations" :key="index">
                                                    <div class="pt-8">
                                                        <div class="flex items-center justify-between">
                                                            <div class="flex space-x-2 items-start">
                                                                <div class="rounded-full bg-gray-300 text-primary w-9 h-9 flex flex-none items-center justify-center font-semibold"
                                                                    x-text="index +1"></div>
                                                                <div class="flex flex-col text-sm pl-4">
                                                                    <div class="text-left">
                                                                        <p class="font-semibold"
                                                                            x-text="donation.donationName">
                                                                        </p>
                                                                        <p>
                                                                            <span x-text="donation.is80G == 0 ? donation.subcategoryName + ' (non-80G)' : donation.subcategoryName"></span>
                                                                            <span
                                                                                x-text="` - ₹ `"></span>
                                                                            <span
                                                                                x-text="formatNumber(donation.donationAmount)"></span>
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div class="flex flex-col space-y-2 text-md items-between">
                                                                <p
                                                                    class="font-noto-serif text-xl text-right font-semibold">
                                                                    <span x-text="`₹ `"></span> <span
                                                                        x-text="formatNumber(donation.donationAmount)"></span>
                                                                </p>
                                                                <button
                                                                    class="uppercase text-white bg-primary border border-white rounded-md text-sm px-4 py-1 font-noto-sans"
                                                                    @click="removeDonation(index)">Remove</button>
                                                            </div>
                                                        </div>
                                                        <div class="border-b border-gray-200 mt-6"></div>
                                                    </div>
                                                </template>
                                                <div class="flex justify-between space-x-4 md:space-x-0 mt-16">
                                                    <button
                                                        class="mb-16 rounded-md py-2 md:py-4 lg:py-6 text-lg text-primary bg-white border border-primary md:w-2/5"
                                                        @click="currentStep = 1;">
                                                        + Add Another Donation</button>
                                                    <button
                                                        class="mb-16 rounded-md py-2 md:py-4 lg:py-6 text-lg text-white bg-dark md:w-2/5"
                                                        @click="payeeModal = true;">Proceed to pay ₹<span
                                                            x-text="formatNumber(donationForm.totalAmount)"></span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </template>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
            <!-- Payee Modal -->
            <div x-show="payeeModal && donationForm.selectedDonations?.length > 0"
                @click.away="payeeModal = false; document.body.classList.remove('no-scroll')"
                x-init="$watch('payeeModal', value =>  value ? document.body.classList.add('no-scroll') : document.body.classList.remove('no-scroll'))"
                class="fixed inset-0 z-100" x-cloak>
                <!-- overlay -->
                <div class="inset-0 fixed bg-black/20 backdrop-blur-sm"></div>
                <!-- modal -->
                <div class="fixed inset-0 md:w-[80%] lg:w-[70%] md:mx-auto">
                    <div class="relative bg-white py-4 md:py-12 rounded-lg shadow-md my-16 px-4 md:px-20 md:mt-20 mx-4 max-h-[90%] overflow-y-scroll overflow-x-none"
                        @click.away="payeeModal = false">
                        <div class="absolute right-4 top-4 md:right-8 md:top-8 ">
                            <button @click="payeeModal = false" class="text-2xl">&times;</button>
                        </div>
                        <h2 class="text-primary font-noto-sans text-center font-semibold text-xl md:mb-4">Payee Details</h2>
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 space-x-6 font-noto-serif">

                            <div class="col-span-2 md:col-span-1">
                                <label for="donorName"></label>
                                <input type="text" x-model="donationForm.donorName" placeholder="Name"
                                    class="text-sm placeholder:text-[#98649D]/50 text-primary w-5/6 border-l-0 border-r-0 border-t-0 border-b border-primary py-2 px-1 ml-6 mr-4 outline-none focus:outline-none appearance-none focus:ring-1 focus:ring-[#98649D] focus:border-0 focus:border-[#98649D]"
                                    required>
                            </div>
                            <div class="col-span-2 md:col-span-1">
                                <label for="email"></label>
                                <input type="email" id="email" x-model="donationForm.email"
                                    placeholder="Email"
                                    class="text-sm placeholder:text-[#98649D]/50 text-primary w-full border-l-0 border-r-0 border-t-0 border-b border-primary py-2 px-1 ml-1 mr-4 outline-none focus:outline-none appearance-none focus:ring-1 focus:ring-[#98649D] focus:border-0 focus:border-[#98649D]"
                                    required>
                            </div>
                            <div class="relative col-span-2 md:col-span-1">
                                <select x-model="donationForm.countryCode" class="py-2 text-sm w-full rounded text-primary appearance-none outline-[#98649D] 
                                         focus:ring-1 focus:ring-[#98649D] focus:border-transparent
                                         hover:border-primary text-primary">
                                    <option value="">Select country code</option>
                                    <template x-for="code in countryCodes" :key="code.code">
                                        <option :value="code.dial_code"
                                            :selected="donationForm.countryCode == code.dial_code"
                                            x-text="code.name + ' (' + code.dial_code + ')'"></option>
                                    </template>
                                </select>
                            </div>
                            <div class="col-span-2 md:col-span-1">
                                <label for="mobile"></label>
                                <input type="text" id="mobile" x-model="donationForm.mobileNumber"
                                    placeholder="Mobile"
                                    class="text-sm placeholder:text-[#98649D]/50 text-primary w-full border-l-0 border-r-0 border-t-0 border-b border-primary py-2 px-1 ml-1 mr-4 outline-none focus:outline-none appearance-none focus:ring-1 focus:ring-[#98649D] focus:border-0 focus:border-[#98649D]"
                                    required>
                            </div>

                            <!-- Postage Dropdown -->
                            <div class="font-noto-serif col-span-2">
                                <!-- <label class="text-sm text-[#98649D]">Choose Delivery Method:</label> -->
                                <div class="relative">
                                    <select id="postage" @change="handlePostage($event)" class="py-2 text-sm w-full rounded text-primary appearance-none outline-[#98649D] 
                                         focus:ring-1 focus:ring-[#98649D] focus:border-transparent
                                         hover:border-primary text-primary">
                                        <option value="">Select a Postage Option</option>
                                        <template x-for="option in postageOptions" :key="option.id">
                                            <option :value="JSON.stringify({ id: option.id, amount: option.amount })"
                                                x-text="option.name + ' - ₹' + option.amount"></option>
                                            <!-- :selected="donationForm.postageCharges == option.amount" -->
                                        </template>
                                    </select>
                                </div>
                            </div>

                            <button
                                class="md:col-span-2 text-right text-sm text-primary underline"
                                @click="showAddressOP = !showAddressOP; fetchAddresses()">+ Pick address from
                                list
                            </button>
                            <div class="w-full text-sm p-4 rounded-lg shadow-lg md:col-span-2"
                                x-show="showAddressOP" @click.away="showAddressOP = false">
                                <h2 class="text-lg font-semibold mb-2 ml-2 text-primary">Addresses</h2>
                                <template x-for="addressRef in user.addresses">
                                    <button
                                        class="flex items-start space-x-2 cursor-pointer text-primary w-full hover:bg-[#98649D80] p-2 rounded-lg"
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
                            <!-- country selection -->
                            <div class="text-sm relative md:mt-8 col-span-2 md:col-span-1">
                                <input type="text"
                                    placeholder="Country" x-model="donationForm.country"
                                    class="text-sm placeholder:text-[#98649D]/50 text-primary w-full border-b border-primary text-sm py-2 focus:outline-none border-l-0 border-r-0 border-t-0 border-primary text-sm py-2 focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-primary text-primary px-1"
                                    @keyup="filterCountries()">
                                <div class="absolute z-100 bg-gray-200 w-1/3 border-0"
                                    x-show="filteredCountries.length > 0">
                                    <ul>
                                        <template x-for="country in filteredCountries">
                                            <li @click="setCountry(country)" class="hover:bg-gray-300 text-sm placeholder:text-[#98649D]/50 text-primary w-full text-sm py-2 focus:outline-none text-sm py-2 focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 text-primary px-1" x-text="country.name"></li>
                                        </template>
                                    </ul>
                                </div>
                                <!-- <div class="border-b-2 border-[#98649D]/50 ml-1 mr-2"></div> -->
                            </div>

                            <div class="col-span-2 md:col-span-1">
                                <p class="text-xs text-primary md:mt-3">Pincode</p>
                                <input type="text" id="pincode" x-model="donationForm.pincode"
                                    class="w-full border-b border-primary text-sm focus:outline-none border-l-0 border-r-0 border-t-0 text-sm focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 text-primary px-1">
                            </div>

                            <div class="relative col-span-2 md:col-span-1">
                                <input type="text" placeholder="State"
                                    x-model="donationForm.state" class="text-sm placeholder:text-[#98649D]/50 text-primary w-full border-b border-primary text-sm py-2 focus:outline-none border-l-0 border-r-0 border-t-0 border-primary text-sm py-2 focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0
                                                    hover:border-primary text-primary px-1"
                                    @keyup="filterStates()">
                                <div class="absolute z-100 bg-gray-200 w-1/3 border-0"
                                    x-show="filteredStates.length > 0">
                                    <ul>
                                        <template x-for="state in filteredStates">
                                            <li @click="setState(state)"
                                                class="p-2 cursor-pointer hover:bg-gray-300"
                                                x-text="state.name"></li>
                                        </template>
                                    </ul>
                                </div>
                            </div>

                            <div class="col-span-2 md:col-span-1">
                                <input type="text" x-model="donationForm.addressLine1" id="streetAddress"
                                    placeholder="Street and Area Address"
                                    class="placeholder:text-[#98649D]/70 text-primary w-full border-b border-primary text-sm py-2 focus:outline-none border-l-0 border-r-0 border-t-0 border-primary text-sm py-2 focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-primary text-primary px-1">
                            </div>

                            <div class="col-span-2 md:col-span-1">
                                <input type="text" x-model="donationForm.addressLine2" id="locality"
                                    placeholder="Locality"
                                    class="placeholder:text-[#98649D]/70 text-primary w-full border-b border-primary text-sm py-2 focus:outline-none border-l-0 border-r-0 border-t-0 border-primary text-sm py-2 focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-primary text-primary px-1">
                            </div>

                            <div class="col-span-2 md:col-span-1">
                                <!-- <label for="landmark" class="text-primary text-sm">Landmark</label> -->
                                <input type="text" x-model="donationForm.landmark" id="landmark"
                                    placeholder="Landmark"
                                    class="placeholder:text-[#98649D]/70 text-primary w-full border-b border-primary text-sm py-2 focus:outline-none border-l-0 border-r-0 border-t-0 border-primary text-sm py-2 focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-primary text-primary px-1">
                            </div>

                            <div class="relative col-span-2 md:col-span-1">
                                <!-- <label for="city" class="text-primary text-sm">Town / Village / City</label> -->
                                <input type="text"
                                    placeholder="Town / Village / City"
                                    x-model="donationForm.city" class="text-sm placeholder:text-[#98649D]/50 text-primary w-full border-b border-primary text-sm py-2 focus:outline-none border-l-0 border-r-0 border-t-0 border-primary text-sm py-2 focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0
                                                            hover:border-primary text-primary px-1"
                                    @keyup="filterCities()">
                                <div class="absolute z-100 bg-gray-200 w-1/3 border-0"
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

                            <div class="col-span-2 md:grid grid-cols-2 md:space-x-4 mb-6">
                                <div x-show="has80Gcause == 1" class="col-span-1 mr-2">
                                    <div class="mt-7 flex flex-col md:flex-row justify-between border-b border-primary pb-1">
                                        <label for="claim80G" class="text-primary text-sm pl-1">Do you want to claim 80G benefits?</label>
                                        <div class="flex space-x-4">
                                            <div class="flex items-center space-x-2">
                                                <input type="radio" id="yes" name="claim80G" value="1"
                                                    x-model="donationForm.claim80G"
                                                    class="text-primary border-primary focus:ring-[#98649D] focus:border-[#98649D] focus:outline-none checked:bg-[#98649D] checked:border-[#98649D]">
                                                <label for="yes" class="text-primary text-xs">Yes</label>
                                            </div>
                                            <div class="flex items-center space-x-2">
                                                <input type="radio" id="no" name="claim80G" value="0"
                                                    x-model="donationForm.claim80G"
                                                    class="text-primary border-primary focus:ring-[#98649D] focus:border-[#98649D] focus:outline-none checked:bg-[#98649D] checked:border-[#98649D]">
                                                <label for="no" class="text-primary text-xs">No</label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <!-- if they want to claim 80G benefits then ask for PAN number. -->
                                <div x-show="donationForm.claim80G == 1" class="">
                                    <input type="text" x-model="donationForm.pan"
                                        @input="donationForm.pan = donationForm.pan.toUpperCase()"
                                        placeholder="PAN Number"
                                        class="text-sm placeholder:text-[#98649D] text-primary w-full border-primary text-sm focus:outline-none border-l-0 border-r-0 border-t-0 py-2 md:mt-4 focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 text-primary px-1">
                                </div>
                            </div>
                        </div>
                        <div class="mb-6 md:col-span-2 ml-3">
                            <div class="flex items-start space-x-2">
                                <input type="checkbox" id="confirmInfo" x-model="donationForm.confirmInfo"
                                    class="text-primary border-primary focus:ring-[#98649D] focus:border-[#98649D] accent-[#98649D] checked:bg-[#98649D] checked:border-[#98649D]">
                                <label for="confirmInfo" class="text-primary text-sm">I confirm that the information given in this form is true, complete and accurate.
                                    <br>I agree that the above contribution may be treated as donation towards the corpus fund of the trust.</label>
                            </div>
                        </div>
                        <div x-show="validationMessages.length"
                            class="text-red-500 text-sm text-center mt-12">
                            <template x-for="message in validationMessages" :key="message">
                                <p x-text="message"></p>
                            </template>
                        </div>

                        <div class="flex justify-center gap-6 md:gap-12 items-center mt-8 md:mt-20 mb-2 font-noto-sans">
                            <button @click="clearModal()" class="px-4 py-2 bg-gray-200 text-secondary font-medium rounded text-xs">Clear Fields</button>
                            <button @click="validateModal()"
                                class=" bg-dark text-md text-white uppercase py-2 pr-4 pl-8 rounded-md flex items-center" :class="!donationForm.confirmInfo ? 'cursor-not-allowed' : 'cursor-pointer'" :disabled="!donationForm.confirmInfo">
                                Submit
                                <span class="ml-4 material-icons text-sm"></span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- footer -->
        <div>
            <div class="pl-0 lg:pl-4 pb-8 lg:pb-12"
                style="background-image: url('/assets/images/background-tan-texture-web.jpg')">
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
                                <p class="mt-6 lg:mb-8 text-md font-bold italic">donate@sringeri.net</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div style="background-image: url('/assets/images/background-tan-texture-web.jpg')">
                <hr>
                <p class="text-center text-sm lg:text-md text-[#7e6f5c] py-4 px-4 lg:px-0 w-full">&copy; <span
                        x-text="new Date().getFullYear()"></span>. All Rights
                    Reserved by Dakshinamnaya Sri Sharada Peetham, Sringeri</p>
            </div>
        </div>

        <script>
            function data() {
                return {
                    user: {
                        name: "",
                        isAnonymous: "",
                        uid: '',
                        kartas: [],
                        addresses: [],
                    },
                    isCartOpen: false,
                    showLogout: false,
                    payeeModal: false,
                    formatNumber(value) {
                        value = parseInt(value);
                        return value ? value.toLocaleString("en-IN") : "0";
                    },
                    totalDonationAmount() {
                        this.donationForm.totalAmount = this.donationForm.selectedDonations?.reduce((total, donation) => total + Number(donation.donationAmount), 0);
                        if (this.donationForm.postageCharges) {
                            this.donationForm.totalAmount += Number(this.donationForm.postageCharges);
                        }
                    },
                    removeDonation(index) {
                        this.donationForm.selectedDonations?.splice(index, 1);
                        this.donationForm.postageCharges = 0;
                        this.totalDonationAmount();
                    },
                    addDonations(donation) {
                        // Ensure selectedDonations exists as an array.
                        if (!this.donationForm.selectedDonations) {
                            this.donationForm.selectedDonations = [];
                        }

                        // Deep-copy the donation object
                        const newDonation = JSON.parse(JSON.stringify(donation));
                        const donationType = Number(newDonation.is80G);
                        const currentDonations = this.donationForm.selectedDonations;

                        if (currentDonations.length === 0) {
                            // First donation: simply add it.
                            currentDonations.push(newDonation);
                        } else {
                            // Determine the type of the current donations by checking the first item.
                            const currentType = Number(currentDonations[0].is80G);
                            if (currentType !== donationType) {
                                // Conflict detected: clear the cart and add the new donation.
                                this.donationForm.selectedDonations = [newDonation];
                            } else {
                                // Same type: add the new donation.
                                currentDonations.push(newDonation);
                            }
                        }

                        // Update dependent UI/totals.
                        this.check80G();
                        this.totalDonationAmount();
                        this.resetDonation();
                    },

                    has80Gcause: false,

                    // Update the has80Gcause flag based on the cart's donations.
                    check80G() {
                        if (!this.donationForm.selectedDonations || this.donationForm.selectedDonations.length === 0) {
                            this.has80Gcause = false;
                            return;
                        }
                        this.has80Gcause = this.donationForm.selectedDonations.some(donation => Number(donation.is80G) === 1);
                    },
                    home: true,
                    getBgImage(id) {
                        switch (id) {
                            case 1:
                                return '/assets/images/donationHeading1.jpg';
                            case 2:
                                return '/assets/images/donationHeading2.jpg';
                            case 3:
                                return '/assets/images/donationHeading3.jpg';
                                // case 4:
                                // return 'assets/images/donationHeading4.jpg';
                            default:
                                return '/assets/images/donationHeading1.jpg';
                        }
                    },
                    initialCause: "<?= $cause ?>",
                    checkInitialCause() {
                        // console.log(this.initialCause);
                        if (this.initialCause != '') {
                            this.donationHeadings.forEach(heading => {
                                if (heading.slug == this.initialCause) {
                                    this.selectDonationHeading(heading);
                                }
                            });
                        }
                    },
                    async init() {
                        await this.checkLogin();
                        // await this.fetchData();
                        // await this.fetchKartas();
                        // this.selectedDonationHeading = this.donationHeadings[0];
                        // this.checkInitialCause();
                    },
                    async checkLogin() {
                        this.isLoggedIn = true; // TODO: Big security hole   
                        firebase.auth().onAuthStateChanged((authUser) => {
                            if (authUser) {
                                this.isLoggedIn = true;
                                this.user = authUser;
                                this.user.uid = authUser.uid;
                                this.user.isAnonymous = authUser.isAnonymous;
                                // console.log("in check login " + this.user.isAnonymous);
                                this.fetchData();
                            } else {
                                // redirect to login
                                this.isLoggedIn = false;
                                location.href = "/online-services";
                            }
                        });
                    },
                    async fetchDevoteeDetails() {
                        const uid = this.user.uid; // Replace this with actual UID fetching
                        try {
                            let response = await fetch(`https://onlineservices.sringeri.net/api/onlineDevotee/${uid}`);
                            let data = await response.json();

                            // Only update required fields
                            this.user.name = data.name;
                            this.user.isAnonymous = data.isAnonymous;
                            this.user.uid = data.uid;
                            this.donationForm.donorName = data.name;
                            this.donationForm.email = data.email;
                            this.donationForm.mobileNumber = data.mobile;
                            this.donationForm.countryCode = data.countryCode;
                            // console.log(this.user.isAnonymous + " in fetchDevotee");
                            // console.log(this.user.name + " in fetchDevotee");
                        } catch (error) {
                            console.error("Error fetching user data:", error);
                        }
                        // this.selectedDonationHeading = this.donationHeadings[0];
                    },
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
                    calendarTypes: [],
                    tithis: [],
                    chandraMasas: [],
                    souraMasas: [],
                    nakshatras: [],
                    countryCodes: [],
                    clearNakshatra() {
                        if (this.newDonation.fromTithiId != "") {
                            this.newDonation.fromNakshatraId = "";
                        }
                    },
                    clearTithi() {
                        if (this.newDonation.fromNakshatraId != "") {
                            this.newDonation.fromTithiId = "";
                        }
                    },

                    getData: async function(_url) {
                        let response = await fetch(_url);
                        let data = await response.json();
                        return data;
                    },
                    async fetchData() {
                        this.postageOptions = await this.getData('/api/postageOptionsDonation');
                        this.donationHeadings = await this.getData('/api/donationHeading');
                        // REMOVE THIS WHEN slugs ARE ADDED TO THE DATABASE
                        this.donationHeadings.forEach(heading => {
                            heading.slug = heading.name.toLowerCase().replace(/ /g, "-");
                        });
                        this.checkInitialCause();
                        //console.log(this.donationHeadings);
                        this.donationCategories = await this.getData('/api/donationCategory');
                        // console.log(this.donationCategories);
                        await this.fetchDevoteeDetails();
                        this.calendarTypes = await this.getData('/api/calendarTypes');
                        this.tithis = await this.getData('/api/tithis');
                        this.chandraMasas = await this.getData('/api/chandraMasas');
                        this.souraMasas = await this.getData('/api/souraMasas');
                        this.nakshatras = await this.getData('/api/nakshatras');
                        this.countryCodes = await this.getData('/assets/js/countryCodes.json');
                        // console.log(this.countryCodes);
                    },
                    postageOptions: [],
                    donationHeadings: [],
                    donationCategories: [],
                    subcategories: [],
                    currentStep: 1,
                    isOpen: false,
                    showCategories: true,
                    showSubCategories: true,
                    selectedSubCategory: null,
                    customAmountMode: false,
                    isExpanded: false,
                    selectedCategory: null,

                    showKartaList: false,
                    showAddressOP: false,
                    async selectKarta(_kartaRef) {
                        this.fetchKartas();
                        this.newDonation.donationInTheNameOf = _kartaRef.name;
                        this.showKartaList = false;
                    },
                    async fetchKartas() {
                        const response = await fetch(`https://onlineservices.sringeri.net/api/devoteeKarta/${this.user.uid}`);
                        this.user.kartas = await response.json();
                        //console.log(this.user.kartas);
                    },
                    async selectAddressOP(_addressRef) {
                        this.donationForm.addressLine1 = _addressRef.addressLine1;
                        this.donationForm.addressLine2 = _addressRef.addressLine2;
                        this.donationForm.landmark = _addressRef.landmark;
                        this.donationForm.city = _addressRef.city;
                        this.donationForm.state = _addressRef.state;
                        this.donationForm.country = _addressRef.country;
                        this.donationForm.pincode = _addressRef.pincode;
                        this.showAddressOP = false;
                    },
                    async fetchAddresses() {
                        const response = await fetch(`https://onlineservices.sringeri.net/api/devoteeAddress/${this.user.uid}`);
                        this.user.addresses = await response.json();
                        // console.log(this.user.addresses);
                    },
                    showError: false,
                    errorSubcategoryId: "",
                    has80GSelected() {
                        return this.donationForm.selectedDonations?.some(d => Number(d.is80G) === 1);
                    },
                    hasNon80GSelected() {
                        return this.donationForm.selectedDonations?.some(d => Number(d.is80G) === 0);
                    },
                    handleSubCategoryClick(subcategory) {
                        // First, update the selected subcategory (ensure your selectSubCategory method works properly)
                        this.selectSubCategory(subcategory);

                        // Determine the type of donations already in the cart.
                        const has80GSelected = this.donationForm.selectedDonations?.some(d => Number(d.is80G) === 1);
                        const hasNon80GSelected = this.donationForm.selectedDonations?.some(d => Number(d.is80G) === 0);
                        const isAdding80G = Number(subcategory.is80G) === 1;

                        // If mixing types (80G vs non-80G) is attempted:
                        if ((has80GSelected && !isAdding80G) || (hasNon80GSelected && isAdding80G)) {
                            // Show error message for this subcategory.
                            this.showError = true;
                            this.errorSubcategoryId = subcategory.id;
                            return; // Prevent further selection
                        }

                        // No conflict – clear any error.
                        this.showError = false;
                        this.errorSubcategoryId = null;
                        // (Optionally, if you need to add to the cart immediately, do it here)
                        // Otherwise, rely on addDonations() to push the donation when confirmed.
                    },
                    showConfirmPopup: false,
                    handleProceed() {
                        if (this.showError) {
                            this.showConfirmPopup = true;
                        } else {
                            this.validateStep1();
                        }
                    },

                    confirmReplaceBasket() {
                        this.donationForm.selectedDonations = [];
                        this.validateStep1();
                        this.showConfirmPopup = false;
                    },

                    cancelReplaceBasket() {
                        this.resetDonation();
                        this.showConfirmPopup = false;
                    },

                    donationForm: {},
                    newDonation: {},

                    resetDonation() {
                        this.newDonation = {
                                donationName: "",
                                donationId: "",
                                subCategoryId: "",
                                subcategoryName: "",
                                is80G: 0,
                                imagePath: "",
                                donationAmount: 0,
                                calendarType: "",
                                monthId: "",
                                fromChandraMasaId: "",
                                fromSouraMasaId: "",
                                specificDate: "",
                                fromTithiId: "",
                                fromNakshatraId: "",
                                donationInTheNameOf: "",
                                donationRemarks: "",
                            },
                            this.showCategories = true;
                        this.showSubCategories = true;
                        this.subcategories = [];
                        this.selectedAmountOptions = [];
                        this.selectedAmount = 0;
                        this.customAmount = "";
                        this.selectedCategory = null;
                        this.selectedSubCategory = null;
                        this.validationMessages = [];
                        this.showError = false;
                        this.uploaded = false;
                    },
                    resetDonationForm() {
                        this.donationForm = {
                            uid: this.user.uid,
                            selectedDonations: [],
                            //modal before payment
                            donorName: "",
                            countryCode: "+91",
                            mobileNumber: "",
                            country: "India",
                            pincode: "",
                            state: "Maharashtra",
                            addressLine1: "", // Street and Area Address
                            addressLine2: "", // Locality
                            landmark: "",
                            city: "", // Town/Village/City
                            district: "",
                            email: "",
                            postageCharges: 0,
                            postageId: "",
                            totalAmount: 0,
                            claim80G: 0,
                            pan: "",
                            confirmInfo: false,
                        }
                        this.currentStep = 1;
                    },
                    previousClaim80G: "", // Store previous value in case of cancel
                    showClaim80GPopup: false, // Controls popup visibility
                    pendingClaim80G: "", // Stores new value temporarily
                    handleClaim80GChange(newValue) {

                        // console.log(this.donationForm.claim80G, newValue);
                        if (newValue === this.donationForm.claim80G) {
                            this.donationForm.claim80G = newValue;
                            return;
                        }
                        if (this.donationForm.selectedDonations?.length > 0) {

                            // if (this.donationForm.claim80G != newValue) {
                            this.previousClaim80G = this.donationForm.claim80G;
                            this.pendingClaim80G = newValue;
                            this.showClaim80GPopup = true;
                            // }
                        } else {
                            // Directly apply the new selection if no donations exist
                            this.donationForm.claim80G = newValue;
                        }
                    },
                    cancelClaim80GChange() {
                        // Revert to previous value
                        // this.donationForm.claim80G = this.previousClaim80G;
                        // this.showClaim80GPopup = false;
                    },
                    confirmClaim80GChange() {
                        // Apply new value and clear selected donations
                        // this.donationForm.claim80G = this.pendingClaim80G;
                        this.donationForm.selectedDonations = [];
                        this.showClaim80GPopup = false;
                        this.donationForm.totalAmount = 0;
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
                        // console.log(this.countries);

                        this.filteredCountries = this.countries.filter((country) => {
                            return country.name.toLowerCase().includes(this.donationForm.country.toLowerCase());
                        });
                    },
                    selectedCountry: {},
                    setCountry(_country) {
                        this.donationForm.country = _country.name;
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
                            return state.name.toLowerCase().includes(this.donationForm.state.toLowerCase());
                        });
                    },
                    setState(_state) {
                        this.donationForm.state = _state.name;
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
                            return city.name.toLowerCase().includes(this.donationForm.city.toLowerCase());
                        });
                    },
                    setCity(_city) {
                        this.donationForm.city = _city.name;
                        this.filteredCities = [];
                    },
                    posterPopup: false,
                    selectedDonationHeading: null,

                    get selectedDonationCategories() {
                        return this.donationCategories.filter(category => category.donationHeadingId === this.selectedDonationHeading?.id);
                    },
                    selectedAmountOptions: [],
                    selectedAmount: 0,
                    customAmount: 0,

                    get isStep1Valid() {
                        // console.log("In the step 1 validation");
                        let errors = [];
                        if (!this.selectedCategory) {
                            errors.push("Please select a donation category.");
                        }
                        if (!this.selectedSubCategory) {
                            errors.push("Please select a donation subcategory.");
                        }
                        if (!this.selectedAmount && !this.customAmount) {
                            errors.push("Please select or enter a donation amount.");
                        }
                        if (this.customAmount && this.customAmount <= 0) {
                            errors.push("Please enter a valid donation amount.");
                        }
                        if (this.selectedSubCategory?.hasDonationDate == 1) {
                            if (!this.newDonation.calendarType) {
                                errors.push("Please select a calendar type.");
                            }
                        }
                        if (this.newDonation.calendarType == 1 && !this.newDonation.monthId) {
                            errors.push("Please select a month.");
                        }
                        if (this.newDonation.calendarType == 1 && !this.newDonation.specificDate) {
                            errors.push("Please select a specific date.");
                        }
                        if (this.newDonation.calendarType == 2 && !this.newDonation.fromChandraMasaId) {
                            errors.push("Please select a chandra masa.");
                        }
                        if (this.newDonation.calendarType == 3 && !this.newDonation.fromSouraMasaId) {
                            errors.push("Please select a soura masa.");
                        }
                        if ((this.newDonation.calendarType == 2 || this.newDonation.calendarType == 3) &&
                            (!this.newDonation.fromTithiId && !this.newDonation.fromNakshatraId)) {
                            errors.push("Please select a tithi or a nakshatra.");
                        }
                        // console.log(errors?.length);
                        return errors.length === 0;
                    },
                    validationMessages: [],
                    validateStep1() {
                        this.validationMessages = [];
                        if (!this.selectedCategory) {
                            this.validationMessages.push("Please select a donation category.");
                        }
                        if (!this.selectedSubCategory) {
                            this.validationMessages.push("Please select a donation subcategory.");
                        }
                        if (!this.selectedAmount && !this.customAmount) {
                            this.validationMessages.push("Please select or enter a donation amount.");
                        }
                        if (this.customAmount && this.customAmount <= 0) {
                            this.validationMessages.push("Please enter a valid donation amount.");
                        }
                        if (this.selectedSubCategory?.hasDonationDate == 1) {
                            if (!this.newDonation.calendarType) {
                                this.validationMessages.push("Please select a calendar type.");
                            }
                        }
                        if (this.newDonation.calendarType == 1 && !this.newDonation.monthId) {
                            this.validationMessages.push("Please select a month.");
                        }
                        if (this.newDonation.calendarType == 1 && !this.newDonation.specificDate) {
                            this.validationMessages.push("Please select a specific date.");
                        }
                        if (this.newDonation.calendarType == 2 && !this.newDonation.fromChandraMasaId) {
                            this.validationMessages.push("Please select a chandra masa.");
                        }
                        if (this.newDonation.calendarType == 3 && !this.newDonation.fromSouraMasaId) {
                            this.validationMessages.push("Please select a soura masa.");
                        }
                        if ((this.newDonation.calendarType == 2 || this.newDonation.calendarType == 3) && (!this.newDonation.fromTithiId && !this.newDonation.fromNakshatraId)) {
                            this.validationMessages.push("Please select a tithi or a nakshatra.");
                        }
                        if (this.selectedSubCategory?.hasUpload == 1 && (this.selectedSubCategory?.id == 3 || this.selectedSubCategory?.id == 4)) {
                            if (!this.newDonation.imagePath) {
                                this.validationMessages.push("Please upload a photo.");
                            }
                        }
                        if (this.validationMessages.length > 0) {
                            return;
                        }
                        if (!this.newDonation.donationInTheNameOf) {
                            this.newDonation.donationInTheNameOf = "";
                        }
                        if (!this.newDonation.donationRemarks) {
                            this.newDonation.donationRemarks = "";
                        }
                        if (!this.newDonation.imagePath) {
                            this.newDonation.imagePath = "";
                        }
                        this.addDonations(this.newDonation);
                        this.currentStep = 2;
                        window.scrollTo({
                            top: 0,
                            behavior: 'smooth'
                        });
                    },
                    validateModal() {
                        this.validationMessages = [];
                        if (!this.donationForm.donorName || this.donationForm.donorName.trim().length < 3) {
                            this.validationMessages.push("Donor Name must be at least 3 characters.");
                        }
                        if (!this.donationForm.email || this.donationForm.email.trim().length < 5) {
                            this.validationMessages.push("Email must be at least 5 characters.");
                        } else {
                            this.donationForm.email = this.donationForm.email.trim();
                            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.donationForm.email)) {
                                this.validationMessages.push("Enter a valid email address.");
                            }
                        }
                        if (!this.donationForm.mobileNumber) {
                            this.validationMessages.push("Enter a valid mobile number.");
                        }

                        this.donationForm.mobileNumber = this.donationForm.mobileNumber.trim();
                        if (!this.donationForm.countryCode) {
                            this.validationMessages.push("Please select a country code.");
                        }
                        if (!this.donationForm.mobileNumber) {
                            this.validationMessages.push("Enter a valid mobile number.");
                        } else {
                            if (this.donationForm.countryCode === '+91') {
                                if (!/^\d{10}$/.test(this.donationForm.mobileNumber)) {
                                    this.validationMessages.push("Please enter a valid 10-digit mobile number.");
                                }
                            }
                        }

                        if (!this.donationForm.country) {
                            this.validationMessages.push("Please select a country.");
                        }
//                         if (!this.donationForm.pincode || !/^\d{5,6}$/.test(this.donationForm.pincode)) {
//                             this.validationMessages.push("Enter a valid 5 or 6-digit pincode.");
//                         }
                        if (!this.donationForm.state) {
                            this.validationMessages.push("Please select a state.");
                        }
                        if (!this.donationForm.addressLine1 || this.donationForm.addressLine1.trim().length < 5) {
                            this.validationMessages.push("Address must be at least 5 characters.");
                        }
                        if (!this.donationForm.city || this.donationForm.city.trim().length < 3) {
                            this.validationMessages.push("City must be at least 3 characters.");
                        }
                        if (this.donationForm.postageCharges == "" || this.donationForm.postageCharges == null || this.donationForm.postageCharges == undefined || this.donationForm.postageId == '') {
                            this.validationMessages.push("Please select a postage option before proceeding.");
                        }
                        if (this.has80Gcause) {
                            if (this.donationForm.claim80G === null || this.donationForm.claim80G === undefined) {
                                this.validationMessages.push("Please select whether you would like 80G benefits.");
                            }
                        }
                        if (this.donationForm.claim80G == 1) {
                            // Convert PAN to uppercase before validation
                            this.donationForm.pan = this.donationForm.pan?.toUpperCase();

                            if (!this.donationForm.pan || !/^[A-Z]{5}\d{4}[A-Z]{1}$/.test(this.donationForm.pan)) {
                                this.validationMessages.push("Enter a valid PAN number.");
                            }
                        }
                        if (this.validationMessages.length > 0) {
                            return;
                        }
                        this.payeeModal = false;
                        this.isCartOpen = false;
                        if (!this.donationForm.claim80G) {
                            this.donationForm.claim80G = 0;
                        }
                        this.submitDonations();
                    },

                    clearModal() {
                        this.donationForm.donorName = "";
                        this.donationForm.email = "";
                        this.donationForm.mobileNumber = "";
                        this.donationForm.countryCode = "";
                        this.donationForm.country = "";
                        this.donationForm.pincode = "";
                        this.donationForm.state = "";
                        this.donationForm.addressLine1 = "";
                        this.donationForm.addressLine2 = "";
                        this.donationForm.landmark = "";
                        this.donationForm.city = "";
                        this.donationForm.postageCharges = "";
                    },
                    async submitDonations() {
                        this.donationForm.uid = this.user.uid;
                        this.totalDonationAmount();
                        // console.log(JSON.stringify(this.donationForm));
                        // return;
                        let response = await fetch("/api/makeDonation", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify(this.donationForm),
                        });

                        let data = await response.json();
                        // console.log(data);

                        if (data.status == 'Successful') {

                            var form = document.createElement('form');
                            form.method = 'POST';
                            // Use the correct CCavenue endpoint URL (check the documentation for production/sandbox endpoints)
                            form.action = 'https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction';
                            form.style.display = 'none';

                            // Prepare the required parameters
                            var params = {
                                encRequest: data.encRequest, // or checksum, etc.
                                access_code: data.access_code
                            };

                            // Append each parameter as a hidden input field
                            for (var key in params) {
                                if (params.hasOwnProperty(key)) {
                                    var input = document.createElement('input');
                                    input.type = 'hidden';
                                    input.name = key;
                                    input.value = params[key];
                                    form.appendChild(input);
                                }
                            }

                            // Append the form to the document and submit it
                            document.body.appendChild(form);
                            form.submit();
                        } else {
                            alert("We could not complete the payment at this moment. Please try after sometime.");
                        }
                        this.resetDonation();
                        this.resetDonationForm();
                    },
                    handlePostage(event) {
                        if (event.target.value) {
                            const selected = JSON.parse(event.target.value);
                            if(selected.amount == 0) {
                                this.donationForm.postageCharges = '0';
                            } else {
                                this.donationForm.postageCharges = selected.amount;
                            }
                            
                            this.donationForm.postageId = selected.id;
                        } else {
                            this.donationForm.postageCharges = '';
                            this.donationForm.postageId = '';
                        }
                        this.totalAmount();
                    },

                    totalAmount() {
                        this.newDonation.totalAmount = (+this.newDonation.donationAmount || 0) + (+this.donationForm.postageCharges || 0);

                        const selected = this.postageOptions.find(
                            opt => Number(opt.amount) === Number(this.donationForm.postageCharges)
                        );

                        // this.donationForm.postageId = selected ? selected.id : null;
                    },

                    selectPoster(_poster) {
                        this.posterPopup = true;
                        this.selectedDonationHeading = _poster;
                    },
                    selectDonationHeading(_donationHeading) {
                        this.selectedDonationHeading = _donationHeading;
                        history.pushState({
                            id: _donationHeading.id
                        }, _donationHeading.name, `/online-donation/${_donationHeading.slug}`);
                        this.currentStep = 1;
                        this.home = false;
                        this.selectedCategory = null;
                        this.selectedSubCategory = null;
                        this.showCategories = true;
                        this.resetDonation();
                    },
                    selectCategory(category) {
                        this.newDonation.donationName = category.name;
                        this.newDonation.donationId = category.id;
                        this.selectedCategory = category;
                        this.subcategories = this.selectedCategory?.subcategories || [];
                        // this.showSubCategories = true;
                        this.selectedAmountOptions = [];
                        this.selectedSubCategory = null;
                        this.showCategories = false;
                    },
                    selectSubCategory(subcategory) {
                        // here
                        this.newDonation.subcategoryName = subcategory.name;
                        this.newDonation.subCategoryId = subcategory.id;
                        this.newDonation.is80G = subcategory.is80G;
                        this.selectedSubCategory = subcategory;
                        // this.showSubCategories = true;
                        this.selectedAmount = 0;
                        this.customAmountMode = false;
                        this.customAmount = "";
                    },
                    selectAmount(amount) {
                        this.applySelectedAmount();
                        this.newDonation.donationAmount = amount;
                        this.selectedAmount = amount;
                        // this.customAmountMode = false;
                        this.showSubCategories = false;
                    },
                    setAmountOptions() {
                        const selectedSubcategory = this.subcategories.find(
                            (sub) => sub.id == this.newDonation.subCategoryId
                        );
                        this.selectedAmountOptions = selectedSubcategory ? selectedSubcategory.amountOptions : [];
                    },
                    applySelectedAmount() {
                        if (this.selectedAmount) {
                            this.newDonation.donationAmount = this.selectedAmount;
                            this.customAmount = 0;
                            this.showSubCategories = false;
                        }
                        this.totalAmount();
                    },
                    applyCustomAmount() {
                        if (this.customAmount > 0) {
                            this.newDonation.donationAmount = this.customAmount;
                            this.selectedAmount = 0;
                            this.showSubCategories = false;
                        } else {
                            alert("Please enter a valid amount");
                        }
                        this.totalAmount();
                    },
                    proceedToDetails() {
                        if (this.selectedAmount > 0) {
                            alert(
                                `Proceeding with ${this.selectedAmount} in ${this.selectedCurrency}`
                            );
                            this.currentStep++;
                        } else {
                            alert("Please select an amount before proceeding");
                        }
                    },

                    // file upload 
                    uploading: false,
                    uploaded: false,
                    uploadImages(files) {
                        if (!files.length) {
                            return;
                        }
                        if (this.uploading) {
                            return;
                        }
                        this.uploading = true;
                        const formData = new FormData();
                        for (let i = 0; i < files.length; i++) {
                            formData.append('files[]', files[i]);
                        }

                        fetch('../donationUpload.php', {
                                method: 'POST',
                                body: formData
                            })
                            .then(response => response.json())
                            .then(data => {
                                let path = data[0].path;
                                // console.log('Images uploaded:', path);
                                this.newDonation.imagePath = path;
                                //reset formdata once images are uploaded
                                // this.$refs.files.value = '';
                                this.uploaded = true;
                                this.uploading = false;
                            })
                            .catch(error => console.error('Error uploading images:', error));
                    },
                };
            }
        </script>
</body>

</html>