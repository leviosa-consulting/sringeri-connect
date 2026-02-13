<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sringeri Accomodation</title>
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
    </style>
</head>

<body class=" font-noto-sans overflow-x-hidden">
    <!-- page starts here -->
    <div x-data="data()">
        <div class="flex flex-col lg:flex-row overflow-x-hidden">
            <!-- Left Section -->
            <div class="lg:w-[36%] pt-4 md:pt-16 bg-white text-black">
                <div class="flex items-center md:justify-center">
                    <img src="./assets/images/onlineSevaLogo.png" alt="Logo" class="lg:w-[60%] w-[50%] ml-12">
                </div>
                <!-- sticky cart mobile -->
                <div class="lg:hidden block absolute top-5 md:top-12 md:right-12 lg:top-24 right-4 lg:right-24 z-200">
                        <button @click="showLogout = !showLogout" @click.away="showLogout = false"
                            class="text-gray-200 bg-dark rounded-xl text-xs relative">
                            <div class="flex items-center justify-between px-2 font-noto-serif italic py-1">
                                <p class="pl-1">Namaste <br> <span x-text="user.name"></span></p>
                                <span class="material-icons" x-text="showLogout ? 'keyboard_arrow_up' : 'keyboard_arrow_down'"></span>
                            </div>

                            <div x-show="showLogout" x-transition
                                class="bg-primary py-1 text-center rounded-b-xl">
                                <a href="https://onlineservices.sringeri.net/logout"
                                    class="flex items-center justify-center justify-center px-4 py-1 text-white">
                                    Logout <span class="material-icons text-sm ml-1">power_settings_new</span>
                                </a>
                            </div>
                        </button>
                    </div>

                <!-- Menu Section (For md+ devices) -->
                <div class="hidden lg:block pl-2 pt-6 lg:pl-52 lg:pt-24">
                    <!-- Loop through menu items dynamically -->
                    <template x-for="(menuItem, idx) in menuItems" :key="menuItem.id">
                        <a :href="menuItem.link" x-show="menuItem.id !== 'viewProfile' || (menuItem.id === 'viewProfile' && !user.isAnonymous)" class="cursor-pointer transition-all duration-300 text-xl"
                            :class="menuItem.id === 'bookAccommodation' ? 'text-primary font-bold italic' : 'text-primary-light'">
                            <div class="flex items-center">
                                <span class="font-noto-serif">
                                    <span x-text="menuItem.name"></span>
                                </span>
                                <span class="material-icons ml-4" x-show="menuItem.id === 'bookAccommodation'">arrow_forward</span>
                            </div>
                            <div class="border-b-2 my-6" x-show="(user?.isAnonymous && idx < 2) || (!user?.isAnonymous && idx < 3)"
                                :class="menuItem.id === 'bookAccommodation' ? 'border-primary' : 'border-primary-light w-[65%]'"></div>
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
                                class="cursor-pointer text-lg py-1 flex-shrink-0 transition-all px-4 py-3 rounded-lg"
                                :class="menuItem.id === 'bookAccommodation' ? 'active-nav text-primary font-semibold italic bg-white' : 'text-primary-light'">

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
            </div>

            <!-- Right Section -->
            <div class="lg:w-[64%] bg-primary min-h-screen">
                <!-- sticky cart -->
                <div class="relative lg:h-40 h-24 md:h-32">
                    <!-- Cart Icon -->
                    <div class="hidden lg:block absolute top-5 md:top-12 md:right-12 lg:top-24 right-4 lg:right-24 z-200">
                        <button @click="showLogout = !showLogout" @click.away="showLogout = false"
                            class="text-gray-200 bg-dark rounded-xl text-xs relative">
                            <div class="flex items-center justify-between px-2 font-noto-serif italic py-2">
                                <p class="pl-1">Namaste <br> <span x-text="user.name"></span></p>
                                <span class="material-icons" x-text="showLogout ? 'keyboard_arrow_up' : 'keyboard_arrow_down'"></span>
                            </div>

                            <div x-show="showLogout" x-transition
                                class="bg-white py-1 text-center rounded-b-xl">
                                <a href="https://onlineservices.sringeri.net/logout"
                                    class="flex items-center justify-center justify-center px-4 py-2 text-primary">
                                    Logout <span class="material-icons text-sm ml-1">power_settings_new</span>
                                </a>
                            </div>
                            <div class="absolute bg-white rounded-full h-6 w-6 -top-2 -left-2"></div>
                        </button>
                    </div>
                </div>
                <div x-show="home" class="text-gray-200 p-6 lg:mr-48 lg:ml-20 md:mx-24 text-sm">
                    <h2 class="text-center font-semibold text-lg md:text-xl mt-2 mb-16 font-noto-serif">Terms and Conditions</h2>
                    <template x-for="term in terms">
                        <div class="flex items-start mb-1">
                            <div class="text-lg">&mdash;</div>
                            <div class="ml-4 mt-1"><span x-html="term"></span></div>
                        </div>
                    </template>

                    <!-- Agree button -->
                    <div class="flex justify-center my-20">
                        <button @click="home = false"
                            class="bg-dark  uppercase py-3 px-6 md:px-8 rounded-lg mb-20">
                            I AGREE WITH THESE TERMS
                        </button>
                    </div>
                </div>

                <div x-show="!home">
                    <div class="md:ml-20 md:mr-32">
                        <!-- booking details -->
                        <template x-if="currentStep === 1">
                            <div class="text-white">

                                <h3 class="font-noto-serif text-lg text-gray-200 text-center font-bold md:mt-12">Booking details</h3>

                                <h3 class="font-noto-serif text-gray-200 mt-12 text-center text-sm">Choose a date for accommodation
                                </h3>

                                <!-- Calendar -->
                                <div class="flex flex-col md:flex-row mt-4 overflow-x-scroll px-4">
                                    <template x-for="(month, index) in months" :key="index">
                                        <div class="p-3 bg-dark rounded-lg shadow-md mb-4 md:mr-4 flex-none">
                                            <div class="text-center uppercase my-4 mt-2 mb-2" x-text="month.name"></div>
                                            <div class="grid grid-cols-7 gap-1 mt-8 font-noto-serif">
                                                <div class="text-xs font-thin text-center">Sun</div>
                                                <div class="text-xs font-thin text-center">Mon</div>
                                                <div class="text-xs font-thin text-center">Tue</div>
                                                <div class="text-xs font-thin text-center">Wed</div>
                                                <div class="text-xs font-thin text-center">Thu</div>
                                                <div class="text-xs font-thin text-center">Fri</div>
                                                <div class="text-xs font-thin text-center">Sat</div>

                                                <template x-for="(day, dayIndex) in month.days" :key="dayIndex">
                                                    <div :class="getClass(day)" x-text="day.date" class="text-center py-2 px-5 rounded text-xs" @click="selectDate(day)"></div>
                                                </template>
                                            </div>
                                        </div>
                                    </template>
                                </div>
                                <div class="col-span-3 col-start-1 grid grid-cols-2 gap-2 md:gap-0 md:flex md:space-x-4 text-xs mt-4 mb-12 px-4">
                                    <div class="text-center rounded px-4 py-2 bg-white text-secondary">Available</div>
                                    <div class="text-center rounded px-4 py-2 bg-primary text-secondary font-medium border border-secondary">Not available</div>
                                    <div class="text-center rounded px-4 py-2 border border-secondary text-primary-light bg-dark">Slot not open</div>
                                    <div class="text-center rounded px-4 py-2 bg-green-600 text-white">Selected</div>
                                </div>

                                <div class="mt-4" x-show="reservationData.reservedDate != ''">
                                    <div class="">
                                        <div class="md:mr-20 mx-4" x-show="allowRoomSelection">
                                            <h3 class="block font-noto-serif text-gray-200 mt-12 text-center text-sm">Select a building</h3>
                                            <template x-for="(room, index) in selectedDate.availability" :key="index">
                                                <div class="grid grid-cols-4 w-full mt-4 p-2 rounded-lg" :class="room.selected ? 'bg-primary text-white shadow-xl border border-2 border-white' : 'bg-white text-primary'">
                                                    <!-- img -->
                                                    <div class="col-span-3 flex space-x-6">
                                                        <div class="w-20 h-20 mt-1 bg-gray-500"></div>
                                                        <div class="flex flex-col py-2">
                                                            <p class="text-sm" x-text="room.dispName"></p>
                                                            <p class="font-semibold" x-text="`₹${room.rent + room.deposit}`"></p>
                                                            <p class="uppercase text-sm mt-2 cursor-pointer hidden" @click="openRoomDetails(room)">More details</p>
                                                        </div>

                                                    </div>
                                                    <div class="flex items-center justify-center">
                                                        <button @click="selectRoom(room)" x-text="room.selected ? 'Selected' : 'Select'"></button>
                                                    </div>
                                                </div>
                                            </template>
                                        </div>
                                    </div>
                                    <p class="text-gray-200 text-center pt-6" x-text="errorMessage"></p>
                                    <div class="flex justify-center items-center mt-8 mb-10">
                                        <button @click="validateStep1()"
                                            class="bg-dark text-md text-white uppercase py-3 rounded-md flex items-center mr-4 px-4 md:px-8">Proceed
                                            <span class="ml-4 md:ml-6 material-icons text-sm">arrow_forward</span>
                                        </button>
                                    </div>

                                    <div x-show="showRoomDetails"
                                        x-data="{ images: [], currentIndex: 0, prevImage() { this.currentIndex = (this.currentIndex === 0) ? this.images.length - 1 : this.currentIndex - 1;},nextImage() { this.currentIndex = (this.currentIndex === this.images.length - 1) ? 0 : this.currentIndex + 1;}}"
                                        x-init=" $watch('selectedRoomDetails', (room) => {if (room) {images = room.images;currentIndex = 0;}});">
                                        <div class="fixed inset-0">
                                            <!-- Overlay -->
                                            <div class="fixed inset-0 bg-black/50 bg-blur-sm"></div>
                                            <!-- Modal -->
                                            <div class="fixed inset-0 z-50 flex items-center justify-center">
                                                <div class="bg-white text-primary rounded-lg shadow-lg p-8 pb-12 w-[90dvw] md:w-full max-w-2xl">
                                                    <div class="flex flex-col">
                                                        <div class="relative h-8 mb-4">
                                                            <h2 class="text-xl font-bold mt-6 md:mt-0 text-center" x-text="selectedRoomDetails ? selectedRoomDetails.dispName : ''"></h2>
                                                            <p @click="showRoomDetails = false" class="text-4xl cursor-pointer absolute -top-3 md:top-0 right-0 md:right-2">&times;</p>
                                                        </div>
                                                        <!-- Image Slider -->
                                                        <div class="flex items-center justify-center relative m-4">
                                                            <!-- Previous Button -->
                                                            <button @click="prevImage" class="absolute -left-8 md:left-2 text-primary hover:text-[#98649D]">
                                                                <span class="material-icons">chevron_left</span>
                                                            </button>

                                                            <!-- Image -->
                                                            <img :src="images[currentIndex]" class="w-[280px] h-[200px] md:w-[420px] md:h-[300px] object-cover">

                                                            <!-- Next Button -->
                                                            <button @click="nextImage" class="absolute -right-8 md:right-2 text-primary hover:text-[#98649D]">
                                                                <span class="material-icons">chevron_right</span>
                                                            </button>
                                                        </div>
                                                        <div class="mx-4">
                                                            <div>
                                                                <button class="flex items-center justify-center bg-primary text-white uppercase py-2 px-4 rounded-md text-xs mb-4 mt-6">
                                                                    <a href="selectedRoomDetails.googleLocation" target="_blank">See Location</a>
                                                                </button>
                                                            </div>
                                                            <p x-text="selectedRoomDetails ? selectedRoomDetails.desc : ''"></p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </template>
                        <!-- occupant details -->
                        <template x-if="currentStep === 2">
                            <div class="font-noto-serif text-white">
                                <h3 class="font-noto-serif text-lg text-gray-200 text-center font-bold md:mt-12">Enter Occupants</h3>
                                <h2 class="text-lg my-4 text-white ml-4 md:ml-12">Occupant 1</h2>
                                <div class="mx-4 flex justify-center">
                                    <div class="bg-white rounded-lg shadow-lg p-8 pb-12 w-full max-w-2xl">
                                        <div class="space-y-6">
                                            <input type="text" x-model="reservationData.occupantName1" placeholder="Occupant Name"
                                                class="placeholder:text-[#98649D]/70 text-primary  w-full border-b border-primary text-sm py-2 focus:outline-none border-l-0 border-r-0 border-t-0 border-primary text-sm py-2 focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-[#98649D] text-primary px-1">

                                            <input type="number" x-model="reservationData.occupantAge1" placeholder="Age"
                                                class="placeholder:text-[#98649D]/70 text-primary  w-full border-b border-primary text-sm py-2 focus:outline-none border-l-0 border-r-0 border-t-0 border-primary text-sm py-2 focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-[#98649D] text-primary px-1">

                                            <input type="text" x-model="reservationData.occupantIdNumber1" placeholder="Aadhaar Number / Passport Number"
                                                class="placeholder:text-[#98649D]/70 text-primary  w-full border-b border-primary text-sm py-2 focus:outline-none border-l-0 border-r-0 border-t-0 border-primary text-sm py-2 focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-[#98649D] text-primary px-1">

                                            <div class="relative hidden">
                                                <select x-model="reservationData.countryCode" class="py-2 text-sm w-full rounded text-primary appearance-none outline-[#98649D] 
                                         focus:ring-1 focus:ring-[#98649D] focus:border-transparent
                                         hover:border-[#98649D] text-primary">
                                                    <option value="">Select country code</option>
                                                    <template x-for="code in countryCodes" :key="code.code">
                                                        <option :value="code.dial_code"
                                                            :selected="reservationData.countryCode == code.dial_code"
                                                            x-text="code.name + ' (' + code.dial_code + ')'"></option>
                                                    </template>
                                                </select>
                                            </div>
                                            <input type="tel" x-model="reservationData.mobileNumber" placeholder="Mobile Number"
                                                class="placeholder:text-[#98649D]/70 text-primary  w-full border-b border-primary text-sm py-2 focus:outline-none border-l-0 border-r-0 border-t-0 border-primary text-sm py-2 focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-[#98649D] text-primary px-1">

                                            <input type="email" x-model="reservationData.email" placeholder="Email"
                                                class="placeholder:text-[#98649D]/70 text-primary  w-full border-b border-primary text-sm py-2 focus:outline-none border-l-0 border-r-0 border-t-0 border-primary text-sm py-2 focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-[#98649D] text-primary px-1">
                                        </div>
                                    </div>
                                </div>
                                <h2 class="text-lg mb-4 text-white ml-4 md:ml-12 mt-12">Occupant 2</h2>
                                <div class="mx-4 flex justify-center">
                                    <div class="bg-white rounded-lg shadow-lg p-8 pb-12 w-full max-w-2xl">
                                        <div class="space-y-6">
                                            <input type="text" x-model="reservationData.occupantName2" placeholder="Occupant Name"
                                                class="placeholder:text-[#98649D]/70 text-primary  w-full border-b border-primary text-sm py-2 focus:outline-none border-l-0 border-r-0 border-t-0 border-primary text-sm py-2 focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-[#98649D] text-primary px-1">

                                            <input type="number" x-model="reservationData.occupantAge2" placeholder="Age"
                                                class="placeholder:text-[#98649D]/70 text-primary  w-full border-b border-primary text-sm py-2 focus:outline-none border-l-0 border-r-0 border-t-0 border-primary text-sm py-2 focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-[#98649D] text-primary px-1">

                                            <input type="text" x-model="reservationData.occupantIdNumber2" placeholder="Aadhaar Number / Passport Number"
                                                class="placeholder:text-[#98649D]/70 text-primary  w-full border-b border-primary text-sm py-2 focus:outline-none border-l-0 border-r-0 border-t-0 border-primary text-sm py-2 focus:outline-none appearance-none outline-none focus:ring-1 focus:ring-[#98649D] focus:border-0 hover:border-[#98649D] text-primary px-1">
                                        </div>
                                    </div>
                                </div>
                                <p class="text-gray-200 text-center pt-6" x-text="errorMessage"></p>
                                <div class="flex items-center justify-between font-noto-sans mt-12 mb-16 md:mx-4">
                                    <!-- Back Button -->
                                    <button @click="currentStep = 1"
                                        class="ml-4 md:ml-8 md:ml-1 text-sm border border-white text-white uppercase py-3 px-3 md:pr-8 md:pl-4 rounded-md flex items-center">
                                        <span
                                            class="material-icons text-sm">arrow_backward</span>
                                        Back
                                    </button>
                                    <!-- Proceed Button -->
                                    <button @click="validateStep2()"
                                        class="bg-dark text-md text-white uppercase py-3 rounded-md flex items-center mr-4 lg:mr-8 px-4 md:px-8">Proceed
                                        <span class="ml-4 md:ml-6 material-icons text-sm">arrow_forward</span>
                                    </button>
                                </div>
                            </div>
                        </template>
                        <!-- payment -->
                        <template x-if="currentStep === 3">
                            <div class="text-white">
                                <h3 class="font-noto-serif text-lg text-gray-200 text-center font-bold mb-12 mt-12">Booking Summary</h3>
                                <div class="flex justify-center flex-col items-center">
                                    <!-- <h3 class="font-semibold italic">Booking Summary</h3> -->
                                    <h4>Date of booking: <span x-text="`${formatDate(reservationData.reservedDate)}`"></span></h4>
                                    <h4>No. of occupants: <span x-text="2"></span></h4>
                                </div>
                                <div class="uppercase my-8 text-center">Payment Due: <span class="font-semibold" x-text="`₹ ${formatNumber(reservationData.rent)}`"></span></div>
                                <div class="flex items-center justify-between font-noto-sans mt-24 mb-16 mx-4 md:mx-12">
                                    <!-- Back Button -->
                                    <button @click="currentStep = 2"
                                        class="ml-8 md:ml-1 text-sm border border-white text-white uppercase py-3 px-3 md:pr-8 md:pl-4 rounded-md flex items-center">
                                        <span
                                            class="material-icons text-sm">arrow_backward</span>
                                        Back
                                    </button>
                                    <!-- Proceed Button -->
                                    <button @click="submitReservation()"
                                        class="bg-dark text-md text-white uppercase py-3 rounded-md flex items-center mr-4 px-4 md:px-8">Proceed
                                        <span class="ml-4 md:ml-6 material-icons text-sm">arrow_forward</span>
                                    </button>
                                </div>
                            </div>
                        </template>
                    </div>
                </div>
            </div>
        </div>
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
                                <p class="mt-6 lg:mb-8 text-md font-bold italic">yatri@sringeri.net</p>
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
                showRoomDetails: false,
                selectedRoomDetails: null,
                roomDetailsArr: [
                    {
                        dispName: "Sri Bharathi Theertha Krupa",
                        images: [
                            'https://dummyimage.com/400x300/7C3A59/ffffff.png&text=Image+11',
                            'https://dummyimage.com/400x300/BB78A0/ffffff.png&text=Image+12',
                            'https://dummyimage.com/400x300/4B1436/ffffff.png&text=Image+13'
                        ],
                        desc: "Sri Bharathi Theertha Krupa Lorem ipsum, dolor sit amet consectetur adipisicing elit. Doloribus eos aut, ipsam consequatur quam alias est sit beatae, quia saepe quis! Velit numquam illum corrupti nam repellendus autem quisquam quasi? Alias, deserunt, deleniti qui molestiae laborum tenetur, vel est impedit a eum delectus nostrum laudantium ratione. Iure quia alias perspiciatis?",
                        googleLocation: "",
                    },
                    {
                        dispName: "Sri Sharada Krupa / Yatri Nivasa",
                        images: [
                            'https://dummyimage.com/400x300/7C3A59/ffffff.png&text=Image+21',
                            'https://dummyimage.com/400x300/BB78A0/ffffff.png&text=Image+22',
                            'https://dummyimage.com/400x300/4B1436/ffffff.png&text=Image+23'
                        ],
                        desc: "Sri Sharada Krupa / Yatri Nivasa Lorem ipsum, dolor sit amet consectetur adipisicing elit. Doloribus eos aut, ipsam consequatur quam alias est sit beatae, quia saepe quis! Velit numquam illum corrupti nam repellendus autem quisquam quasi? Alias, deserunt, deleniti qui molestiae laborum tenetur, vel est impedit a eum delectus nostrum laudantium ratione. Iure quia alias perspiciatis?",
                        googleLocation: "",
                    },
                    {
                        dispName: "Guest House (3kms from Temple)",
                        images: [
                            'https://dummyimage.com/400x300/7C3A59/ffffff.png&text=Image+31',
                            'https://dummyimage.com/400x300/BB78A0/ffffff.png&text=Image+32',
                            'https://dummyimage.com/400x300/4B1436/ffffff.png&text=Image+33'
                        ],
                        desc: "Guest House (3kms from Temple) Lorem ipsum, dolor sit amet consectetur adipisicing elit. Doloribus eos aut, ipsam consequatur quam alias est sit beatae, quia saepe quis! Velit numquam illum corrupti nam repellendus autem quisquam quasi? Alias, deserunt, deleniti qui molestiae laborum tenetur, vel est impedit a eum delectus nostrum laudantium ratione. Iure quia alias perspiciatis?",
                        googleLocation: "",
                    }

                ],
                home: true, // to show terms and conditions page
                currentStep: 1,
                user: {
                    name: "",
                    isAnonymous: "",
                    uid: '',
                },
                async checkLogin() {
                    firebase.auth().onAuthStateChanged((authUser) => {
                        if (authUser) {
                            this.user = authUser;
                            this.user.uid = authUser.uid;
                            this.user.isAnonymous = authUser.isAnonymous;
                            // console.log("in check login" + this.user.isAnonymous);
                            this.fetchData();
                        } else {
                            // redirect to login
                            location.href = "/online-services";
                        }
                    });
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
                showLogout: false,
                months: [],
                today: new Date(),
                monthCount: 3,
                startDay: 3,
                endDay: 92,
                roomsInventory: [],
                govtIdTypes: [],

                allowRoomSelection: true,
                maxRooms: 5,

                countryCodes: [],
                init: async function() {
                    this.resetReservationData();
                    await this.checkLogin();
                    // await this.fetchData();
                    this.generateCalendar();
                    this.getInventory();
                },
                terms: [
                    "<strong>Location:</strong> The room bookings done here are for devotees visiting Sringeri (Karnataka)",
                    "<strong>Booking Timeline:</strong> Bookings must be made a minimum of 2 days prior to the required date. For example, if you wish to book a room for the 15th of the month, the booking must be completed on or before 12th of the month, subject to availability",
                    "<strong>Stay Duration:</strong> Each booking/allotment is valid for a 24-hour stay",
                    "<strong>Maximum allowed per room:</strong> Maximum of 4 persons are allowed per room",
                    "<strong>ID Requirement:</strong> Pilgrims must produce the Aadhar Card / Passport which is used for availing the accommodation",
                    "<strong>Booking Expiry:</strong> If the accommodation is not availed on the specified date and timeslot, the booking will expire automatically. Re-scheduling is not permitted under any circumstances",
                    "<strong>Refund:</strong> In the event of non-utilization of accommodation, only the caution deposit (if applicable) will be refunded",
                    "<strong>Individuals Not Allowed:</strong> Individuals or singles are not permitted to book a room. If a second occupant is added as a dummy to bypass this rule, entry will be denied without a refund",
                    "<strong>Security Deposit:</strong> A refundable security deposit shall be collected at the time of check-in. This deposit will be refunded at the time of checkout and return of room keys",
                    "<strong>Management Discretion:</strong> The allotment of rooms is at the discretion of the management, and their decision is final. If the management decides not to allot a room, a refund will be issued",
                    "For inquiries, please contact our helpline at <strong>08265-252525 / 295123</strong>",
                ],
                filter: {
                    ac: -1,
                    toilet: -1,
                    gf: -1,
                    buildingId: "",
                },
                buildings: [{
                        id: 1,
                        name: "Sri Sharadamba Nilaya"
                    },
                    {
                        id: 2,
                        name: "Sri Vidyashankara Nilaya"
                    },
                    {
                        id: 3,
                        name: "Sri Bharati Tirtha Nilaya"
                    },
                ],
                async fetchData() {
                    await this.fetchDevoteeDetails();
                    this.govtIdTypes = await this.getData('/api/govtIdTypes');
                    this.countryCodes = await this.getData('/assets/js/countryCodes.json');
                },
                async getData(url) {
                    const response = await fetch(url);
                    return response.json();
                },
                getInventory: async function() {
                    this.roomsInventory = await this.getData(`/api/onlineInventory`);
                    this.generateCalendar();

                    // console.log(this.roomsInventory);
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
                        // console.log(this.user.isAnonymous + " in fetchDevotee");
                        // console.log(this.user.name + " in fetchDevotee");
                    } catch (error) {
                        console.error("Error fetching user data:", error);
                    }
                },
                generateCalendar() {
                    this.months = [];
                    let current = new Date(this.today.getFullYear(), this.today.getMonth(), 1);

                    for (let i = 0; i < this.monthCount; i++) {
                        let month = {
                            name: current.toLocaleString('default', {
                                month: 'long',
                                year: 'numeric'
                            }),
                            days: []
                        };

                        let daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
                        let firstDayOfMonth = new Date(current.getFullYear(), current.getMonth(), 1);
                        let firstDayOfWeek = firstDayOfMonth.getDay();

                        // Add empty slots for days before the first of the month
                        for (let k = 0; k < firstDayOfWeek; k++) {
                            month.days.push({
                                date: '',
                                disabled: true
                            });
                        }

                        for (let j = 1; j <= daysInMonth; j++) {
                            let date = new Date(current.getFullYear(), current.getMonth(), j + 1);
                            let daysFromToday = Math.floor((date - this.today) / (1000 * 60 * 60 * 24));
                            let disabled = daysFromToday < this.startDay || daysFromToday > this.endDay;

                            let availableData = this.roomsInventory.find(item => item.date === date.toISOString().split('T')[0]);

                            let available = availableData ? availableData.availability.length : 0;
                            let availability = availableData ? availableData.availability : [];
                            let dispDate = availableData ? availableData.dispDate : "";
                            let dbDate = availableData ? availableData.date : "";
                            // let rent = availableData ? availableData.rent : "";
                            // let deposit = availableData ? availableData.deposit : "";
                            month.days.push({
                                dbDate: dbDate,
                                dispDate: dispDate,
                                date: j,
                                disabled: disabled,
                                available: available,
                                availability: availability,
                                selected: false
                            });
                        }

                        this.months.push(month);
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
                formatDate(date) {
                    const formattedDate = new Date(date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short'
                    });
                    const year = new Date(date).getFullYear();
                    return `${formattedDate}, ${year}`;
                },
                formatNumber(value) {
                    return value ? value.toLocaleString("en-IN") : "0";
                },
                selectedDate: {},
                selectDate(day) {
                    this.removeError();

                    if (day.disabled) return;
                    if (day.available <= 0) {
                        alert('No rooms available for this date');
                        return;
                    }
                    if (!day.disabled && day.available > 0) {
                        this.selectedDate = day;
                        this.reservationData.reservedDate = day.dbDate;
                        this.months.forEach(month => {
                            month.days.forEach(day => {
                                day.selected = false;
                            });
                        });
                        day.selected = true;
                        // wait for a second
                        // setTimeout(() => {
                        //     document.getElementById('room-details').scrollIntoView({ behavior: 'smooth' });
                        // }, 1000);
                    }
                    // this.getClass(day);
                    // console.log(this.selectedDate, day);
                },
                reservationData: {},
                resetReservationData() {
                    this.reservationData = {
                        reservedDate: "",
                        mobileNumber: "",
                        email: "",
                        occupantName1: "",
                        occupantAge1: "",
                        occupantIdType1: 1,
                        occupantIdNumber1: "",
                        occupantName2: "",
                        occupantAge2: "",
                        occupantIdType2: 1,
                        occupantIdNumber2: "",
                        roomCount: 1,
                        rent: 0,
                        deposit: 0,
                        inventoryId: 0,
                        filter: {},
                    };
                    this.errorMessage = "";
                },
                validateStep1() {
                    if (this.reservationData.inventoryId === "" || this.reservationData.inventoryId === 0 || this.reservationData.inventoryId === null || this.reservationData.inventoryId === undefined) {
                        this.hasError = true;
                        this.errorMessage = "Please select a room";
                        return;
                    }
                    this.currentStep = 2;
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                },
                validateStep2() {
                    if (this.reservationData.occupantName1.trim() === "" || this.reservationData.occupantAge1.trim() === "" || this.reservationData.occupantIdNumber1.trim() === "" || this.reservationData.mobileNumber.trim() === "" || this.reservationData.email.trim() === "" || this.reservationData.occupantName2 === "" || this.reservationData.occupantAge2 === "" || this.reservationData.occupantIdNumber2 === "") {
                        this.hasError = true;
                        this.errorMessage = "All fields are mandatory";
                        return;
                    }
                    if (this.reservationData.mobileNumber.length !== 10) {
                        this.hasError = true;
                        this.errorMessage = "Mobile number should be 10 digits";
                        return;
                    }
                    if (this.reservationData.occupantIdNumber1.length <= 0 || this.reservationData.occupantIdNumber2.length <= 0) {
                        this.hasError = true;
                        this.errorMessage = "Valid Id (Aadhar / Passport) number required";
                        return;
                    }
                    if (this.reservationData.occupantIdNumber1 === this.reservationData.occupantIdNumber2) {
                        this.hasError = true;
                        this.errorMessage = "Both occupants should not have same Aadhaar number";
                        return;
                    }
                    this.currentStep = 3;
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                },
                selectedRoom: {},
                selectRoom(_room) {
                    if (this.selectedRoom == _room) {
                        this.selectedRoom = {};
                        this.reservationData.rent = 0;
                        this.reservationData.deposit = 0;
                        this.reservationData.inventoryId = 0;
                        _room.selected = false;
                        return;
                    }
                    this.removeError();
                    this.selectedRoom = _room;
                    this.selectedDate.availability.forEach(room => {
                        room.selected = false;
                    });
                    _room.selected = true;
                    this.reservationData.rent = _room.rent;
                    this.reservationData.deposit = _room.deposit;
                    this.reservationData.inventoryId = _room.inventoryId;
                },
                openRoomDetails(room) {
                    this.selectedRoomDetails = this.roomDetailsArr.find(detail => detail.dispName === room.dispName);
                    if (this.selectedRoomDetails) {
                        this.showRoomDetails = true;
                    }
                },
                hasError: false,
                errorMessage: "",
                removeError() {
                    this.hasError = false;
                    this.errorMessage = "";
                },
                checkAadhaar: async function() {
                    this.removeError();
                    if (this.reservationData.occupantIdNumber1.length === 12) {
                        let response = await fetch(`/api/checkReservationAadhaar/${this.reservationData.occupantIdNumber1}/${this.reservationData.reservedDate}`);
                        let data = await response.json();
                        if (data.status === 'error') {
                            this.hasError = true;
                            this.errorMessage = data.msg;
                        }
                    }
                    if (this.reservationData.occupantIdNumber2.length === 12) {
                        let response = await fetch(`/api/checkReservationAadhaar/${this.reservationData.occupantIdNumber2}/${this.reservationData.reservedDate}`);
                        let data = await response.json();
                        if (data.status === 'error') {
                            this.hasError = true;
                            this.errorMessage = data.msg;
                        }
                    }
                },
                submitReservation: async function() {
                    // if(this.hasError) return;

                    if (this.reservationData.inventoryId === 0) {
                        this.hasError = true;
                        this.errorMessage = "Please select a room";
                        return;
                    }

                    if (this.reservationData.occupantName1.trim() === "" || this.reservationData.occupantAge1.trim() === "" || this.reservationData.occupantIdNumber1.trim() === "" || this.reservationData.mobileNumber.trim() === "" || this.reservationData.email.trim() === "" || this.reservationData.occupantName2 === "" || this.reservationData.occupantAge2 === "" || this.reservationData.occupantIdNumber2 === "") {
                        this.hasError = true;
                        this.errorMessage = "All fields are mandatory";
                        return;
                    }
                    if (this.reservationData.mobileNumber.length !== 10) {
                        this.hasError = true;
                        this.errorMessage = "Mobile number should be 10 digits";
                        return;
                    }
                    if (this.reservationData.occupantIdNumber1.length <= 0 || this.reservationData.occupantIdNumber2.length <= 0) {
                        this.hasError = true;
                        this.errorMessage = "Valid Id (Aadhar / Passport) number required";
                        return;
                    }

                    if (this.reservationData.occupantIdNumber1 === this.reservationData.occupantIdNumber2) {
                        this.hasError = true;
                        this.errorMessage = "Both occupants should not have same Aadhaar number";
                        return;
                    }

                    // console.log(this.reservationData); return;

                    this.hasError = false;
                    this.reservationData.filter = this.filter;
                    this.reservationData.rent = this.selectedDate.rent;
                    this.reservationData.deposit = this.selectedDate.deposit;
                    this.reservationData.uid = this.user.uid;
                    console.log(`/api/onlineReservationRzp`, JSON.stringify(this.reservationData));
                    // return;
                    let response = await fetch(`/api/onlineReservationRzp`, {
                        method: "POST",
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(this.reservationData)
                    });
                    let data = await response.json();


                    $api_key = '';
                    $callback_url = 'https://yatri.sringeri.net/rpg/onlinesevaresponse';
                    $cancel_url = 'https://yatri.sringeri.net/rpg/onlinesevaresponse';
                    $image = 'https://yatri.sringeri.net/assets/logo.jpeg';

                    var options = {
                        key_id: $api_key,
                        name: "Sri Sringeri Sharada Peetham",
                        description: "Payment for Accommodation",
                        image: $image,
                        order_id: data.orderId,
                        amount: data.amount,
                        currency: 'INR',
                        prefill: {
                            name: this.reservationData.occupantName1,
                            contact: this.reservationData.mobileNumber,
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
                }
            }
        }
    </script>

</body>

</html>