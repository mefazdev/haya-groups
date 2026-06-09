"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import AnimatedSection from "@/components/AnimatedSection";

const heroImages = [

  "/images/2.jpeg",
  "/images/14.jpeg",
  "/images/3.jpeg",
  "/images/11.jpeg",
];

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="bg-[#0a0a0a] text-gray-100 font-inter antialiased selection:bg-primary selection:text-black">
      <header className="fixed top-0 left-0 w-full z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5 py-4">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 flex justify-between items-center">
          <div className="relative h-12 w-24 md:h-16 md:w-32">
            <Image src="/images/logo-1.png" alt="Haya Convention Center" className="object-contain" fill />
          </div>
          <nav className="flex items-center gap-4 md:gap-8">
            <a href="#about" className="hidden md:block text-sm uppercase tracking-wider hover:text-primary transition-colors">About</a>
            <a href="#venues" className="hidden md:block text-sm uppercase tracking-wider hover:text-primary transition-colors">Venues</a>
            {/* <a href="#gallery" className="hidden md:block text-sm uppercase tracking-wider hover:text-primary transition-colors">Gallery</a> */}
            <a href="https://wa.me/+919061100440" target="_blank" rel="noopener noreferrer" className="text-xs md:text-sm uppercase tracking-wider border border-primary text-primary px-3 py-1.5 md:px-4 md:py-2 hover:bg-primary hover:text-[#050505] transition-all">Inquire</a>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative h-[80vh] md:min-h-screen flex items-center justify-center overflow-hidden pt-20" id="home">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/40 to-[#0a0a0a]/50 z-10"></div>
            {heroImages.map((src, index) => (
              <Image
                key={src}
                src={src}
                alt={`Hero Background ${index + 1}`}
                fill
                priority={index === 0}
                className={`object-cover transition-opacity duration-[2000ms] ease-in-out animate-[slowZoom_20s_ease-out_infinite_alternate] ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
              />
            ))}
          </div>
          <div className="relative z-10 text-center max-w-4xl px-4 md:px-8">
            <h2 className="text-primary tracking-[0.2em] uppercase text-xs sm:text-sm md:text-base font-semibold mb-4 animate-[fadeInUp_1s_ease-out_forwards]">Haya Convention Center</h2>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-playfair mb-6 animate-[fadeInUp_1s_ease-out_forwards]">Where Grandeur Meets Excellence</h1>
            <p className="text-lg sm:text-xl md:text-2xl text-gray-400 mb-10 animate-[fadeInUp_1s_ease-out_0.3s_forwards] opacity-0">Discover the premier destination for unforgettable events, exhibitions, and corporate gatherings.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-[fadeInUp_1s_ease-out_0.6s_forwards] opacity-0">
              <a href="#venues" className="border border-primary text-primary px-6 py-3 md:px-8 uppercase tracking-wider text-sm font-medium hover:bg-primary hover:text-[#050505] transition-all">Explore Venues</a>
              <a href="#contact" className="bg-primary text-[#050505] border border-primary px-6 py-3 md:px-8 uppercase tracking-wider text-sm font-medium hover:bg-primary-hover hover:border-primary-hover transition-all">Book Your Event</a>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-16 md:py-24 bg-[#0a0a0a]">
          <AnimatedSection className="max-w-[1280px] mx-auto px-4 md:px-8 text-center">
            <h2 className="text-4xl md:text-5xl font-playfair text-primary mb-6">The Haya Experience</h2>
            <p className="text-lg text-gray-400 max-w-3xl mx-auto leading-relaxed">
              At Haya Convention Center, we transform visions into reality. With state-of-the-art facilities,
              unparalleled service, and breathtaking architectural elegance, every event becomes a masterpiece.
            </p>
          </AnimatedSection>
        </section>

        {/* Venues Section */}
        <section id="venues" className="py-16 md:py-24 bg-[#050505]">
          <div className="max-w-[1280px] mx-auto px-4 md:px-8">
            <AnimatedSection>
              <h2 className="text-3xl md:text-5xl font-playfair text-primary text-center mb-4">Our Venues & Spaces</h2>
              <p className="text-gray-400 text-center max-w-2xl mx-auto mb-16">Versatile spaces designed to accommodate intimate gatherings and large-scale conventions.</p>
            </AnimatedSection>

            <AnimatedSection delay={200} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Mini conference Hall */}
              <div className="bg-[#141414] border border-[#333] p-8 hover:-translate-y-2 hover:border-primary transition-all duration-300">
                <div className="relative h-64 mb-6">
                  <Image src="/images/22.jpeg" alt="Mini conference Hall" fill className="object-cover" />
                </div>
                <h3 className="text-2xl font-playfair text-primary mb-2">Mini Conference Hall</h3>
                <p className="text-gray-400 mb-6">Perfectly sized for intimate seminars, workshops, and corporate training sessions.</p>
                <a href="#contact" className="text-sm uppercase tracking-wider font-medium hover:text-primary transition-colors">Inquire Space &rarr;</a>
              </div>

              {/* Luxury Room */}
              <div className="bg-[#141414] border border-[#333] p-8 hover:-translate-y-2 hover:border-primary transition-all duration-300">
                <div className="relative h-64 mb-6">
                  <Image src="/images/14.jpeg" alt="Luxury Room" fill className="object-cover" />
                </div>
                <h3 className="text-2xl font-playfair text-primary mb-2">Luxury Rooms</h3>
                <p className="text-gray-400 mb-6">Premium accommodations offering unparalleled comfort for VIP guests and executives.</p>
                <a href="#contact" className="text-sm uppercase tracking-wider font-medium hover:text-primary transition-colors">Inquire Space &rarr;</a>
              </div>

              {/* Prayer Hall */}
              <div className="bg-[#141414] border border-[#333] p-8 hover:-translate-y-2 hover:border-primary transition-all duration-300">
                <div className="relative h-64 mb-6">
                  <Image src="/images/17.jpeg" alt="Prayer Hall" fill className="object-cover" />
                </div>
                <h3 className="text-2xl font-playfair text-primary mb-2">Prayer Hall</h3>
                <p className="text-gray-400 mb-6">A serene, beautifully designed space dedicated to spiritual reflection and prayer.</p>
                <a href="#contact" className="text-sm uppercase tracking-wider font-medium hover:text-primary transition-colors">Inquire Space &rarr;</a>
              </div>

              {/* Stage */}
              <div className="bg-[#141414] border border-[#333] p-8 hover:-translate-y-2 hover:border-primary transition-all duration-300">
                <div className="relative h-64 mb-6">
                  <Image src="/images/2.jpeg" alt="Stage" fill className="object-cover" />
                </div>
                <h3 className="text-2xl font-playfair text-primary mb-2">Stage</h3>
                <p className="text-gray-400 mb-6">A grand performance stage equipped with cutting-edge acoustics and lighting systems.</p>
                <a href="#contact" className="text-sm uppercase tracking-wider font-medium hover:text-primary transition-colors">Inquire Space &rarr;</a>
              </div>

              {/* Food section */}
              <div className="bg-[#141414] border border-[#333] p-8 hover:-translate-y-2 hover:border-primary transition-all duration-300">
                <div className="relative h-64 mb-6">
                  <Image src="/images/15.jpeg" alt="Food Section" fill className="object-cover" />
                </div>
                <h3 className="text-2xl font-playfair text-primary mb-2">Food Section</h3>
                <p className="text-gray-400 mb-6">A spacious, elegantly designed dining area tailored to serve large banquets and events.</p>
                <a href="#contact" className="text-sm uppercase tracking-wider font-medium hover:text-primary transition-colors">Inquire Space &rarr;</a>
              </div>

              {/* Kitchen */}
              <div className="bg-[#141414] border border-[#333] p-8 hover:-translate-y-2 hover:border-primary transition-all duration-300">
                <div className="relative h-64 mb-6">
                  <Image src="/images/6.jpeg" alt="Kitchen" fill className="object-cover" />
                </div>
                <h3 className="text-2xl font-playfair text-primary mb-2">Commercial Kitchen</h3>
                <p className="text-gray-400 mb-6">A fully equipped commercial kitchen built specifically to prepare and serve food for convention center events.</p>
                <a href="#contact" className="text-sm uppercase tracking-wider font-medium hover:text-primary transition-colors">Inquire Space &rarr;</a>
              </div>

              {/* Parking area */}
              <div className="bg-[#141414] border border-[#333] p-8 hover:-translate-y-2 hover:border-primary transition-all duration-300">
                <div className="relative h-64 mb-6">
                  <Image src="/images/3.jpeg" alt="Parking Area" fill className="object-cover" />
                </div>
                <h3 className="text-2xl font-playfair text-primary mb-2">Parking Area</h3>
                <p className="text-gray-400 mb-6">Extensive, secure parking facilities providing easy access for   guests.</p>
                <a href="#contact" className="text-sm uppercase tracking-wider font-medium hover:text-primary transition-colors">Inquire Space &rarr;</a>
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* Amenities Section */}
        <section id="amenities" className="py-16 md:py-24 bg-[#0a0a0a]">
          <div className="max-w-[1280px] mx-auto px-4 md:px-8">
            <AnimatedSection>
              <h2 className="text-3xl md:text-5xl font-playfair text-primary text-center mb-4">Premium Services</h2>
              <p className="text-gray-400 text-center max-w-2xl mx-auto mb-16">We offer an ecosystem of elite services to ensure your event proceeds flawlessly.</p>
            </AnimatedSection>

            <AnimatedSection delay={200} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              <div className="bg-[#141414] border border-[#333] p-8 hover:-translate-y-2 hover:border-primary transition-all duration-300 flex flex-col items-center group">
                <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center text-4xl text-primary mb-6 group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-300">
                  🍽️
                </div>
                <h4 className="text-xl font-playfair text-white mb-3">Gourmet Catering</h4>
                <p className="text-sm text-gray-400 leading-relaxed">Expert culinary teams crafting bespoke menus tailored to your distinct palate.</p>
              </div>

              <div className="bg-[#141414] border border-[#333] p-8 hover:-translate-y-2 hover:border-primary transition-all duration-300 flex flex-col items-center group">
                <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center text-4xl text-primary mb-6 group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-300">
                  🎤
                </div>
                <h4 className="text-xl font-playfair text-white mb-3">Advanced A/V</h4>
                <p className="text-sm text-gray-400 leading-relaxed">State-of-the-art sound, dynamic lighting, and immersive high-definition projection systems.</p>
              </div>

              <div className="bg-[#141414] border border-[#333] p-8 hover:-translate-y-2 hover:border-primary transition-all duration-300 flex flex-col items-center group">
                <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center text-4xl text-primary mb-6 group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-300">
                  👑
                </div>
                <h4 className="text-xl font-playfair text-white mb-3">VIP Lounges</h4>
                <p className="text-sm text-gray-400 leading-relaxed">Exclusive, lavish private areas meticulously designed for special guests and executives.</p>
              </div>

              <div className="bg-[#141414] border border-[#333] p-8 hover:-translate-y-2 hover:border-primary transition-all duration-300 flex flex-col items-center group">
                <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center text-4xl text-primary mb-6 group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-300">
                  🛎️
                </div>
                <h4 className="text-xl font-playfair text-white mb-3">Concierge</h4>
                <p className="text-sm text-gray-400 leading-relaxed">Dedicated 24/7 premium event support and completely flawless logistics management.</p>
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* Gallery Section */}
        {/* <section id="gallery" className="py-24 bg-[#050505]">
          <div className="max-w-[1280px] mx-auto px-8">
            <h2 className="text-4xl md:text-5xl font-playfair text-primary text-center mb-4">Event Gallery</h2>
            <p className="text-gray-400 text-center max-w-2xl mx-auto mb-16">A glimpse into the spectacular events hosted at Haya Convention Center.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="relative aspect-square overflow-hidden group">
                <Image src="/images/8.jpeg" alt="Gala Dinner" fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-primary/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="text-2xl font-playfair text-[#050505] translate-y-4 group-hover:translate-y-0 transition-transform duration-300">Gala Dinners</span>
                </div>
              </div>
              <div className="relative aspect-square overflow-hidden group">
                <Image src="/images/9.jpeg" alt="Corporate Conference" fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-primary/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="text-2xl font-playfair text-[#050505] translate-y-4 group-hover:translate-y-0 transition-transform duration-300">Conferences</span>
                </div>
              </div>
              <div className="relative aspect-square overflow-hidden group">
                <Image src="/images/10.jpeg" alt="Live Concert" fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-primary/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="text-2xl font-playfair text-[#050505] translate-y-4 group-hover:translate-y-0 transition-transform duration-300">Live Events</span>
                </div>
              </div>
            </div>
          </div>
        </section> */}

        {/* Testimonials */}
        {/* <section id="testimonials" className="py-32 bg-[#0a0a0a] text-center">
          <div className="max-w-[1280px] mx-auto px-8">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-playfair text-white mb-8">"An Absolute Masterpiece of a Venue"</h2>
            <p className="text-xl md:text-2xl text-gray-400 italic max-w-4xl mx-auto mb-8 leading-relaxed">
              "Hosting our annual global summit at Haya Convention Center was the best decision we made. The architecture is breathtaking, the technology is flawless, and the staff's attention to detail is truly world-class."
            </p>
            <p className="text-primary font-medium tracking-wider uppercase">
              - Global Tech Innovators
            </p>
          </div>
        </section> */}

        {/* Contact Section */}
        <section id="contact" className="py-16 md:py-24 bg-[#141414] border-y border-[#333]">
          <div className="max-w-[1280px] mx-auto px-4 md:px-8">
            <AnimatedSection className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div>
                <h2 className="text-3xl md:text-5xl font-playfair text-primary mb-6">Ready to Plan Your Event?</h2>
                <p className="text-gray-400 mb-10 text-lg">
                  Reach out to our event specialists to discuss your requirements, check availability, and schedule a private tour of our facilities.
                </p>
                <div className="mb-8">
                  <h4 className="text-xl text-primary mb-2 font-playfair">Location</h4>
                  <p className="text-gray-300">Parappanangadi</p>
                </div>
                <div>
                  <h4 className="text-xl text-primary mb-2 font-playfair">Contact</h4>
                  <div className="text-gray-300 flex flex-col gap-1">
                    <a href="mailto:hayagroup@gmail.com" className="hover:text-primary transition-colors">hayagroup@gmail.com</a>
                    <a href="tel:+919544100440" className="hover:text-primary transition-colors">+91 9544100440</a>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex flex-col mt-6  md:mt- justify-center items-start lg:items-center bg-[#1a1a1a] p-8 md:p-10 border border-[#333]">
                  <h3 className="text-2xl font-playfair text-white mb-4">Fastest Way to Reach Us</h3>
                  <p className="text-gray-400 mb-8 text-left lg:text-center text-sm md:text-base">Connect with our event specialists directly on WhatsApp for immediate assistance.</p>
                  <a href="https://wa.me/+919061100440" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 w-full sm:w-auto bg-[#25D366] text-white px-6 md:px-8 py-4 uppercase tracking-wider font-medium hover:bg-[#20bd5a] transition-all text-sm">
                    <svg className="w-6 h-6 shrink-0" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
                    Chat on WhatsApp
                  </a>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={200} className="mt-12 md:mt-16 w-full h-[300px] md:h-[450px] border border-[#333] grayscale contrast-125 opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3915.9425109940303!2d75.86620187510397!3d11.042937189122464!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ba652f1b8c7d19d%3A0x23cef5dd58362830!2sPallavi%20Theater!5e0!3m2!1sen!2sin!4v1781015776117!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </AnimatedSection>
          </div>
        </section>
      </main>

      <footer className="bg-[#050505] pt-16 md:pt-24 pb-8 border-t border-[#333]">
        <AnimatedSection className="max-w-[1280px] mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12 lg:gap-16 mb-16">
            <div className="max-w-sm">
              <div className="relative h-24 w-48 mb-6">
                <Image src="/images/logo-1.png" alt="Haya Convention Center" className="object-contain" fill />
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">Where Grandeur Meets Excellence. The premier destination for your unforgettable events.</p>
            </div>
            <div className="md:min-w-[200px]">
              <h4 className="text-xl text-primary mb-6 font-playfair">Quick Links</h4>
              <ul className="flex flex-col gap-3 text-sm text-gray-400">
                <li><a href="#about" className="hover:text-primary transition-colors">The Haya Experience</a></li>
                <li><a href="#venues" className="hover:text-primary transition-colors">Our Venues</a></li>
                {/* <li><a href="#gallery" className="hover:text-primary transition-colors">Gallery</a></li> */}
                <li><a href="#contact" className="hover:text-primary transition-colors">Contact Us</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-[#333] text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Haya Convention Center. All rights reserved.
          </div>
        </AnimatedSection>
      </footer>
    </div>
  );
}
