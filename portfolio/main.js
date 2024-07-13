/*=============== SHOW MENU ===============*/
const navMenu = document.getElementById('nav-menu'),
      navToggle = document.getElementById('nav-toggle'),
      navClose = document.getElementById('nav-close')

/* Menu show */
if(navToggle){
    navToggle.addEventListener('click', () =>{
        navMenu.classList.add('show-menu')
    })
}

/* Menu hidden */
if(navClose){
    navClose.addEventListener('click', () =>{
        navMenu.classList.remove('show-menu')
    })
}

/*=============== REMOVE MENU MOBILE ===============*/
const navLink = document.querySelectorAll('.nav-link')

const linkAction = () =>{
    const navMenu = document.getElementById('nav-menu')
    // When we click on each nav__link, we remove the show-menu class
    navMenu.classList.remove('show-menu')
}
navLink.forEach(n => n.addEventListener('click', linkAction))

const contactForm = document.getElementById('contact-form'),
  contactMessage = document.getElementById('contact-message')

 const sendEmail = (e) =>{
    e.preventDefault()

    //serviceID -templateID - #form - publicKey
    emailjs.sendForm('service_s3k94bm','template_j9gmdko','#contact-form','rATtpyoFkfKtq_lrF')
    .then(()=>{
        //show sent messages
        contactMessage.textContent = 'Message sent successfully'

        //Remove message after five seconds
        setTimeout(()=>{
            contactMessage.textContent = ''
        },5000)

        //clear input fields
        contactForm.reset()
    })
 } 

 contactForm.addEventListener('submit',sendEmail)

 //scroll up
 const scrollUp = () => {
    const scrollUp = document.getElementById('scroll-up');
    if (scrollUp) {
        this.scrollY >= 350 ? scrollUp.classList.add('show-scroll')
                            : scrollUp.classList.remove('show-scroll');
    } else {
        console.error("Element with ID 'scroll-up' not found.");
    }
};
window.addEventListener('scroll', scrollUp);

/*=============== SCROLL SECTIONS ACTIVE LINK ===============*/
const sections = document.querySelectorAll('section[id]')
    
const scrollActive = () =>{
  	const scrollDown = window.scrollY

	sections.forEach(current =>{
		const sectionHeight = current.offsetHeight,
			  sectionTop = current.offsetTop - 58,
			  sectionId = current.getAttribute('id'),
			  sectionsClass = document.querySelector('.nav_menu a[href*=' + sectionId + ']')

		if(scrollDown > sectionTop && scrollDown <= sectionTop + sectionHeight){
			sectionsClass.classList.add('active-link')
		}else{
			sectionsClass.classList.remove('active-link')
		}                                                    
	})
}
window.addEventListener('scroll', scrollActive)

