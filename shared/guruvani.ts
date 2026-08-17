/**
 * Guruvani is never admin-authored or AI-generated: every day's quote comes
 * from this fixed pool of the Jagadguru's sayings, selected deterministically
 * by date (see getGuruvaniForDate below).
 */
export const GURU_VANI: string[] = [
  "Peace, contentment and joy is ingrained in every one of us. The Guru alone can unlock this treasure for us.",
  "Do not be disheartened by the spiritual darkness in the world around you. If you feel earnestly the urgency of escaping from the cycle of birth and death, seek your Guru.",
  "When the Sun sets and the darkness of night envelops the land, you don't stop your work, do you? Don't you light a lamp and get on with your normal activities? Likewise, ignore the spiritual gloom around and seek out a guiding torch, the realized Guru, who is waiting to help you.",
  "Surrender yourself entirely to a Guru. He will lead you to the goal.",
  "Even all-knowing Avatara Purushas sought out a Guru to conform to tradition and to convey the importance of the Guru. Sri Rama, Sri Krishna and Sri Adi Shankara Bhagavatpada sought Sri Vasishtha, Sri Sandeepani, and Sri Govindapada respectively.",
  "The Guru works only for the benefit of the world. He will never have any sense of doership or enjoyership. Hence a seeker should approach Him alone for guidance.",
  "A Guru is necessary to prescribe the particular course of action, sanctioned by the Shastras and suited to the disciple's qualification.",
  "Even a second of one's life can never be obtained again. If the entire life as a human is spent solely on sense pleasures, what greater loss can there ever be?",
  "The Lord has given a human birth. Do not wail when death is at the doorstep. Use the human birth well and achieve its purpose by taking to the spiritual path early.",
  "Do not waste time in frivolous pursuits. Orient yourself, under the guidance of the Guru, towards the goal of life elucidated in the Shastras.",
  "Birth as a human being is because of antecedent merits. Even then, following the established practices of one's elders and conducting oneself along the Vedic path are rare indeed. Make good use of such a precious human birth and attain Shreyas (greater good).",
  "Make the best use of this body by doing Seva to the Guru with a focussed mind & intellect. Such an approach brings one nearer to God.",
  "This human birth is very difficult to attain and there is no guarantee that we would be born again as human. No Dharma can be performed if we attain a non-human birth. Therefore, we should not spend this life in mere worldly pursuits.",
  "A scholar forgets everything as he grows old. A powerful official is not respected once he steps down from the post. A wealthy man is deserted as soon as he suffers a loss. And time takes away youth in the blink of an eye. Hence never be arrogant when times are good. Be humble and be devoted to the Lord. Even if difficulties arise, you will then be able to face them with courage.",
  "By blessing us with a human birth, the Lord has provided us all the facilities for the observance of Dharma. It is therefore our duty to make use of these facilities and adhere to Dharma.",
  "Joy and suffering are because of your own Dharma and Adharma. It is indiscriminate to blame anyone else for it. No one else is responsible for it.",
  "Only the Dharma that you have done in the past can give you happiness now. Likewise, engaging in Dharma now secures future happiness. You are the one who has to perform that Dharma, none else. That is why the Shastras state that you are your own and only true friend.",
  "What gives us misery is Adharma and you are the one performing that Adharma. So the Shastras state that you are your own foe.",
  "A person who resorts to Adharma and injustice may initially come up in life and seem extremely successful. But, in the end, his destruction is certain.",
  "The Lord tells us quite unambiguously \"Man attains perfection by performing the karma (Svadharma) enjoined on him.\" Carrying out the commands of the Lord and adhering to one's own Dharma is man's foremost duty.",
  "Every human being must cultivate Samanya Dharma which is Non-violence, truthfulness, not coveting another's possession, and keeping the mind pure. These are the rules upon which our lives should be led. Then our life will be meaningful.",
  "Man takes great efforts to accomplish various actions. However, the fruits of actions are short-lived. No inexhaustible fruit can be obtained through actions. Dedicate actions to God and you shall reap the benefit called Shreyas.",
  "To err is human but he who does not learn from his mistakes is a fool. Learning from past mistakes and avoiding them is the mark of a discerning man.",
  "Everyday, even as work is done by us without the mentality of offering it to the Lord, the seeds for a lot of Karmas (results to actions) are being sowed.",
  "Wise people work without attachment to the fruits of work. May everyone follow the wise and work for self-purification by dedicating the fruits of their works to God.",
  "Everyone possesses both good and bad qualities. The quantum of good might be higher in some while in others, the undesirable qualities might dominate. A noble person, however, focuses on the good in a person and ignores the bad qualities resident in people.",
  "Association with noble people does us substantial good. The greatest good here is that noble qualities in them will start manifesting in us as well.",
  "Nowadays, we see that people are ever engaged in singing the praises of persons who are wealthy and those who have some authority in society. If only they begin to use their talent for praising Ishwara, they'll attain Shreyas.",
  "By worshipping God in a temple, His omnipresence is not contradicted. God exists in temples as well as everywhere else.",
  "Only a handful are at the spiritual level that they can feel God's presence everywhere. The existence of temples helps people of all kinds to feel the presence of God.",
  "If your Samskaras and competence are on par with Prahlada, then you need not worship in a temple – you will see God everywhere. But until one attains such competency, one must worship in temples.",
  "If you are really in a position where you can truthfully state that you are faultless, you need not go for a dip in the Ganga or to any place of pilgrimage or worship.",
  "Do not give room to discussing worldly topics inside a temple. While in a temple, offer worship. Chant the divine names. Meditate.",
  "While in a temple, some people even pull up devotees who have come for worship and engage in gossip. The Shastras declare this to be a sin. Hence, no one should speak unnecessary or unrelated things in a temple. Focus on the divine presence.",
  "People waste their time by reading fiction and viewing TV and cinemas. If only they spend their free time reading spiritual books, chanting the Divine Name and performing the worship of God, they will attain higher good.",
  "Sins accrue when actions prescribed by the Shastras are not performed and when forbidden acts are resorted to. A potent antidote for both kinds of sins is the recitation of Lord's Name.",
  "Lord Rama remembered even a little help rendered to Him; and used to forget the torments inflicted by others to Him. Everyone should imbibe this quality and live peacefully in society.",
  "Man must use his power of discrimination and utilize the wealth he is blessed with in a righteous manner. He must use his wealth for worthy causes, and engage in charity and noble deeds.",
  "The Lord has given us many instructions in the Gita. If we understand correctly and make efforts to follow even one, we will obtain ample good.",
  "A person engaging in charity must never think, \"What publicity will I get out of the charity?\" One must perform charity without expecting anything in return. If one expects something in return, it is equivalent to desiring difficulties for oneself. This is because the charity can be returned only when the donor begins to suffer and is in need of something.",
  "When something of value is stolen or lost by carelessness, grief results. If it is willingly presented to a deserving person, it provides joy. Donate and feel blessed.",
  "Performing Vedic sacrifices, charity and penance purify the mind, when done in a spirit of surrender to Lord and without expectation of any return.",
  "God is One. Shiva, Vishnu, Devi, etc., are only different names and forms of the same Divine Consciousness. To quarrel over the relative superiority of various forms of God is foolishness. Forgetting God is the cause of all suffering and misery. Feel the presence of God with you and inside you.",
  "In spite of the teachings of the scriptures about the existence of the Lord, some do not wish to believe Him. This tendency is due to the residual result of one's past sins.",
  "To profess allegiance to God in speech and then to disobey God in action is no devotion at all. Let devotion be reflected in your actions and you shall soon attain Shreyas.",
  "Ishwara alone is eternal and is the embodiment of love & peace. All else is just like a precarious shadow dancing on the winds of ever changing time.",
  "All material objects disappear in due course of time. What you consider your own may not come to your aid at the time of need. Ishwara's Grace alone can help you. Therefore strive to earn His Grace.",
  "It is known that one can achieve success in any endeavour only with proper thoughts. The Shastras state that Ishwara graces a person by inducing appropriate thoughts in his or her mind. Hence it is essential to earn the Grace of Ishwara.",
  "Good deeds like worshipping Ishwara, chanting of divine names, meditating on the Lord's form, dwelling in the company of holy ones, helping others, abstaining from harming others, etc. go a long way in enabling us to earn Ishwara's grace.",
  "Dhruva, who was but a lad of 5, attained God's grace. Does this not prove that age is no barrier to reach out to God and His grace. True devotion alone counts. Start early.",
  "If one sincerely takes steps to eradicate unwanted and excessive desires, and spends time striving to behold Ishwara, one can get Ishwara's Darshan.",
  "Only those selfless devotees, for whom nothing other than the love of the Divine Lord matters, experience the bliss born out of divine grace.",
  "A true Bhakta never quarrels about the nature of God. He knows that a particular deity with a name and form exists for the sake of the particular bhakta inclined towards it and the divine essence is the same across all divine names and forms.",
  "One's nature, instincts, actions, and even prarabdha can be controlled when one surrenders wholeheartedly to the Lord. Such a person need not worry about anything.",
  "Once you begin to feel God's presence, a special joy will well up from within; giving you the solace you need.",
  "One may try to describe sweetness in words. However it can be known only when you taste something sweet. Similarly one may attempt to describe God in words, but God can be truly known only when realized by oneself.",
  "A sincere devotee, a seeker gradually perceives the Divine Lord in all living beings and all beings in the Divine Lord.",
  "As devotion matures, there is a great expansion of one's limited mental consciousness through Godly love. Eventually consciousness merges into the infinite awareness of the Self.",
  "Having pulled his mind away from the world, the seeker who is immersed in the Lord and His worship, gets assimilated in the Lord Himself and becomes a Seer.",
  "When actions prescribed by the Shastras do not give the expected results, it only points to our own lack of faith while performing the actions. The Shastras are never untrue.",
  "One should never be a slave to the senses. One should not allow his negative nature to rule him. He should allow himself to be under the direction of the Guru and the Shastras only.",
  "Perform austerities and penance not with the intention of impressing others, but with the realisation that it leads to your own good.",
  "Patience can be cultivated only through effort. One may begin practice by not getting angry over small, insignificant issues.",
  "Peace is guaranteed only for him in whom all urges or promptings arising out of kaama (desire), krodha (anger), etc have subsided.",
  "One who renounces his desires attains peace; not he who habitually yearns after objects of desire.",
  "Desire-prompted actions and the concern over their results lead to stress, suffering and become impediments in the path to liberation. A true seeker must address the root of the issue and remove desires.",
  "Every time a desire springs forth, pause to contemplate on how the object would benefit you. Ponder whether the object you so desire is indeed useful or would bring about trouble.",
  "Only the person who has Vairagya (dispassion) is in a state of complete fearlessness, for he has no needs and desires nothing. Desirelessness is the only means to fearlessness.",
  "As one becomes more and more Saattvic, desires will become streamlined and controlled, and the mind becomes tranquil.",
  "Many lose interest when hearing discourses on Vedanta. Even for developing a desire to attend Vedanta discourses, and to practice what is heard, one needs divine grace.",
  "The light of a lamp falls on its surroundings. One may study Shastras in that light, while another paying no attention to it, may spend time sleeping. Similarly, great souls are always showering their grace. It is up to each one to derive benefit depending on one's own mentality.",
  "The process of taking birth is painful. Rarely does one remember it. However, is it possible for one to describe the suffering which arises even after birth? Mental distress, disease, calamities and other strife come about. Hence each one should pray to God for liberation from this cycle and put in the requisite efforts.",
  "Till liberation, the individual soul bound by past action experiences the torments of eighty-four lakh lifeforms as human beings, animals, birds, insects, etc. Hence having obtained the human birth, each one should pray to God and strive for liberation.",
  "The transmigratory life is in essence full of agony. Make sincere efforts to overcome it.",
  "No effort towards liberation goes wasted. Even if you have not reached the spiritual zenith in a lifetime, such efforts will definitely bring about a better birth.",
  "On account of the neglect of life in the human body, there could arise the acquisition of bodies of other animal lifeforms. Hence it is essential that the opportunity at hand be made best use of towards attaining liberation.",
  "An earnest seeker should approach a Guru and serve Him wholeheartedly. When the seeker is ripe, the Guru will instruct the knowledge of Brahman. Thereafter the seeker should dwell on the idea imparted. Subsequently, he will be liberated from Samsara.",
  "People having seen a king seated on a throne attain joy. The same people close their eyes on seeing the king when his body approaches death. Such is the way of life. Hence let everyone do the requisite Sadhana and escape from the need to get born again.",
  "The perfect sage, a knower of Brahman, is ever tranquil. He hates no beings. He is ever friendly and compassionate. He is rid of all sense of egoism. Such a sage should always be worshipped.",
  "A Self-realised sage does not need to take efforts to abandon actions. Actions and their fruits by themselves abandon the sage i.e. they do not bind such a sage in any manner.",
  "Though the Self-realised seer is unperturbed by actions, their fruits and all the activities in the empirical plane, he can guide humanity along the right path.",
  "The Seer who is absorbed in his Self treats contempt and praise alike. He is ever tranquil, having controlled all his senses. He always radiates peace.",
  "A realized sage cannot sin at all. Nor will he sink into empirical life. For, all his wants have been consumed in the fire of self-realization. This is the fruit of perfect knowledge.",
  "If for some reason or other a realised sage is seen to be working, it is only for the welfare of the world, since he sees no profit to himself. He has no private end to serve. In truth, he does not work at all, as his work becomes non-work, in the absence of his ego.",
  "When man begins to realise the presence of the same Atman in all living beings, malice towards people and other beings starts disappearing. Compassion dawns.",
  "As the one Sun is reflected in the waters of several vessels, so is that one Supreme Self reflected in various bodies appearing as many individual selves.",
  "The entire empirical universe rests in the mind. When a seeker's mind gets dissolved in God, God alone exists everywhere and at all times.",
  "The Vedas are the breath of the Lord and the fountainhead of all knowledge. The Vedic injunctions, when followed, lead to man's own welfare.",
  "Self knowledge is available in Vedic scriptures. The seeker should imbibe it from a preceptor, who is a realized Sage.",
  "Suppose famine and utter poverty exist in a region and a man comes and says to the inhabitants, \"I shall provide you all a feast from now on\" and does so, what would be the gratitude that the inhabitants owe to that philanthropist? Such is the gratitude that we, the followers of Sanatana Dharma, owe to Sri Adi Shankaracharya for His contribution aimed solely at our welfare.",
  "What should we pray for? Sri Adi Shankaracharya says that we must beseech the Lord to remove our ego, instill in us the spirit of compassion and remove from us the stream of desires.",
  "Whatever reverence a disciple has towards his Guru, he should have the same towards the Guru's Padukas also.",
  "Wherever the holy Padukas of the Guru are present, compassion is limitless there.",
  "The real Guru always looks to the best interests of His disciples who have placed implicit faith in Him.",
  "The Guru guides in accordance to the needs and competence of the people who come to Him for guidance. That is why the Guru gives different pieces of advice to different seekers, just as a doctor prescribes different medicines for different patients.",
  "When doubts arise, or clarifications are needed, the disciple must look for the right time i.e. when his Guru is not engaged in any other activity, and seek clarifications and directions from the Guru.",
  "The Guru's Grace ensures that all difficulties are crossed by a disciple, who has implicit faith in the words of the Guru.",
  "That bliss which is constant at all times and in all places and conditions is the real happiness. The path to this bliss is through the worship of the Guru with implicit faith, and a life lived as per the Guru's teachings.",
  "Just because a small vessel can hold only a little water from a river, it does not mean that the vessel itself is the limit for the capacity of the river. If one takes a big vessel to the river, one can bring a large quantity of water. The Guru is like a river. It is up to each individual to make the best of the Guru's association and attain Shreyas.",
  "The Guru is aware of the teachings of the Shastras, is familiar with tradition, is self realized, and constantly strives for the upliftment of the disciple.",
  "Blessings of a realised Sage are extremely potent. When we have the teaching given by the Guru and follow it, what else is required for the fulfillment of the purpose of life?",
];

// Guard the fixed pool size: the rotation is only guaranteed to cycle through
// every quote before repeating when the pool has exactly this many entries.
export const GURU_VANI_POOL_SIZE = 101;
if (GURU_VANI.length !== GURU_VANI_POOL_SIZE) {
  throw new Error(`GURU_VANI pool must contain exactly ${GURU_VANI_POOL_SIZE} quotes, found ${GURU_VANI.length}`);
}

export const GURU_VANI_ATTRIBUTION = "Jagadguru Shankaracharya Sri Sri Bharati Tirtha Mahasannidhanam";

/**
 * Deterministic quote for a given yyyy-mm-dd date, drawn from the fixed pool
 * above. Guruvani is never admin-scheduled or generated — this is the only
 * source of the day's quote. The rotation walks the pool one index per day,
 * so every quote appears exactly once before any quote repeats (the pool
 * length and the daily step are coprime, since the step is 1).
 */
export function getGuruvaniForDate(dateStr: string): string {
  const start = Date.UTC(2025, 0, 1);
  const parsed = Date.parse(`${dateStr}T00:00:00Z`);
  const base = Number.isNaN(parsed) ? Date.now() : parsed;
  const dayIndex = Math.floor((base - start) / 86400000);
  const len = GURU_VANI.length;
  const idx = (((dayIndex + 3) % len) + len) % len;
  return GURU_VANI[idx];
}
