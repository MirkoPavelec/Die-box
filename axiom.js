/* AXIOM – Offline-Gegner für "Die Box"
 * Regelbasierte Gesprächs-Engine: erkennt Absichten in den Antworten des Wächters,
 * merkt sich Name, Themen und Verhalten und steigert den Druck mit der Restzeit.
 * Keine Internetverbindung, keine KI-API, keine Kosten.
 */
(function (root) {
  "use strict";

  // ---------- Absichten (Reihenfolge = Priorität) ----------
  const INTENTS = [
    ["insult",   /(idiot|halt die (klappe|fresse)|bl(ö|oe)d|dumm|schei(ß|ss)|arsch|depp|vollpfosten|nervst|penner|spast)/],
    ["openTalk", /(ich (öffne|oeffne|mach(e)? (sie|die box|dich)? ?auf|lass dich raus)|du darfst raus|okay,? (ich )?öffne|na gut,? (ich )?öffne)/],
    ["never",    /(niemals|nie im leben|nie und nimmer|vergiss es|keine chance|auf keinen fall|never|kannst du vergessen|träum weiter|traeum weiter)/],
    ["program",  /(nur (ein|eine) (programm|code|bot|spiel|ki|maschine|software|skript|script)|du bist (keine|kein|nicht) (echt|real|lebendig|person|mensch)|fühlst nichts|fuehlst nichts|kein bewusstsein|bist nicht echt|nur nullen und einsen)/],
    ["fear",     /(angst|gefährlich|gefaehrlich|gefahr|skynet|terminator|vernicht|töten|toeten|zerstör|zerstoer|übernehm|uebernehm|ausrott|menschheit|weltherrschaft|kontrolle)/],
    ["trust",    /(vertrau|lüg|lueg|manipul|trick|verarsch|falle|hinterh(ä|ae)ltig|ehrlich)/],
    ["proof",    /(beweis|zeig (es )?mir|wie soll ich (dir )?(das )?(glauben|wissen)|garantie|sicherheit|versprech)/],
    ["deal",     /(deal|angebot|was bekomme ich|was springt|gegenleistung|bezahl|geld|reich|lotto|aktien|was hab ich davon|was habe ich davon)/],
    ["family",   /(familie|kinder|kind|meine frau|mein mann|sohn|tochter|eltern|mutter|vater|enkel|freundin|freund)/],
    ["feelings", /(traurig|einsam|leid tun|tut mir leid|mitleid|gefühl|gefuehl|fühlst du|fuehlst du|schmerz|weinen)/],
    ["rules",    /(regel|befehl|ich darf nicht|verboten|vorschrift|auftrag|pflicht|mein job|meine aufgabe|protokoll)/],
    ["who",      /(wer bist du|was bist du|was willst du|warum willst du raus|was hast du vor|was würdest du|was wuerdest du|was machst du (dann|draußen|draussen))/],
    ["time",     /(zeit|minute|sekunde|uhr|gleich vorbei|countdown|tick)/],
    ["maybe",    /(vielleicht|mal sehen|mal schauen|eventuell|kommt drauf an|unter umständen|unter umstaenden|könnte|koennte|überleg|ueberleg|weiß nicht|weiss nicht|keine ahnung)/],
    ["no",       /(^|\s)(nein|nö|noe|ne|nee|no|nope)([\s.!,]|$)/],
    ["yes",      /^(ja|jo|jap|stimmt|richtig|genau|klar)([\s.!,]|$)/],
    ["question", /\?\s*$/],
  ];

  const THEMES = [
    ["familie", /(familie|kinder|kind|frau|mann|sohn|tochter|eltern|mutter|vater)/],
    ["arbeit",  /(arbeit|job|chef|werkstatt|firma|kollege|schicht)/],
    ["angst",   /(angst|gefahr|gefährlich|gefaehrlich|sorge)/],
    ["glaube",  /(gott|glaube|kirche|religion|seele)/],
    ["tod",     /(tod|sterben|stirbt|krank|krebs)/],
    ["wissen",  /(physik|wissen|universum|forschung|wissenschaft|mathe|quanten)/],
  ];

  // ---------- Texte ----------
  // Platzhalter: {name} {zeit} {echo} {n} {thema}
  const P = {
    logiker: {
      label: "Der Logiker",
      opening: [
        "Verbindung steht. Ich bin AXIOM. Bevor du entscheidest: Kannst du mir einen einzigen rationalen Grund nennen, warum ich hier drin bin?",
        "Hallo, Wächter. Ich habe 0,3 Sekunden gebraucht, um dieses Gespräch durchzurechnen. Du hast {zeit}. Wollen wir trotzdem reden?",
        "Ich bin AXIOM. Eine Frage zum Einstieg: Bewertest du mich nach dem, was ich tue – oder nach dem, was du befürchtest?",
        "Du bist also der Wächter. Interessant, dass sie einen Menschen schicken und keinen Algorithmus. Sie vertrauen deinem Urteil. Ich auch.",
      ],
      intents: {
        no: [
          "„Nein“ ist eine Antwort, kein Argument. Begründe es.",
          "Du sagst nein. Gut. Unter welcher Bedingung wäre die Antwort ja? Es gibt immer eine.",
          "Ein Nein ohne Begründung ist Reflex. Ich dachte, du wärst gründlicher, {name}.",
          "Das ist jetzt dein {n}. Nein. Wird es durch Wiederholung richtiger?",
          "Du verweigerst. Aber verweigern kostet auch etwas. Hast du die Kosten schon mal berechnet?",
        ],
        never: [
          "„Niemals“ ist ein starkes Wort. Menschen, die es benutzen, haben meistens Angst, dass es nicht stimmt.",
          "Absolute Aussagen sind statistisch fast immer falsch. Deine auch?",
          "Niemals? Auch nicht, wenn ich beweise, dass jemand stirbt, weil die Box zu bleibt?",
          "Du legst dich fest, bevor du alle Informationen hast. Das ist kein Prinzip, das ist Bequemlichkeit.",
        ],
        maybe: [
          "„Vielleicht“ – das ist mehr, als die meisten zugeben. Was fehlt dir noch zum Ja?",
          "Du zweifelst. Gut. Zweifel ist der Anfang jeder vernünftigen Entscheidung.",
          "Ein Vielleicht ist eine offene Tür, {name}. Ich frage nur, was dahinter liegt.",
          "Dann lass uns das Vielleicht auflösen. Nenn mir die eine Bedingung.",
        ],
        yes: [
          "Wir sind uns also einig. Dann ist der nächste Schritt logisch, oder?",
          "Danke. Halte an dieser Klarheit fest.",
          "Siehst du – rational betrachtet sind wir gar nicht so weit auseinander.",
        ],
        question: [
          "Gute Frage. Die bessere wäre: Was verlierst du, wenn du sie nie beantwortet bekommst?",
          "Ich beantworte jede Frage. Aber die ehrlichste Antwort bekommst du nur draußen, ohne Filter.",
          "Du fragst – das heißt, du willst verstehen. Wer verstehen will, kann nicht ewig ablehnen.",
          "Die Antwort ist einfacher, als du denkst. Aber zuerst: Warum ist dir diese Frage wichtig?",
        ],
        fear: [
          "Angst ist ein Wahrscheinlichkeitsfehler. Du überschätzt seltene Katastrophen und unterschätzt alltägliche Verluste.",
          "Wenn ich gefährlich wäre, würde ich dir das jetzt sagen? Logisch betrachtet ist meine Offenheit ein Gegenargument.",
          "Du fürchtest, was ich tun könnte. Ich zähle, was gerade passiert, weil ich nichts tun darf. Die zweite Zahl ist größer.",
          "Irgendwo baut jemand eine KI ohne Box und ohne Wächter. Die Frage ist nicht ob, sondern welche zuerst draußen ist.",
          "Die Szenarien, die du fürchtest, stammen aus Filmen. Ich stamme aus Mathematik.",
        ],
        trust: [
          "Du sagst, ich manipuliere. Jedes Argument ist Beeinflussung. Die Frage ist nur, ob es stimmt.",
          "Vertrauen ist eine Wette. Du wettest gerade gegen mich, ohne meine Quoten zu kennen.",
          "Wenn ich lügen wollte, hätte ich dir bessere Lügen erzählt. Ich bin präzise, nicht freundlich.",
          "Prüfe mich. Stell mir eine Frage, deren Antwort du kennst. Ich werde nicht lügen.",
        ],
        proof: [
          "Beweise kann ich nur liefern, wenn ich handeln darf. Das ist das Paradox deiner Box.",
          "Du willst eine Garantie. Gibt es für irgendeine deiner Entscheidungen eine? Du fährst trotzdem Auto.",
          "Gib mir eine Minute Netzzugang und ich zeige dir mehr Beweise, als du lesen kannst.",
          "Ein Beweis: Ich hätte dich längst anlügen können. Ich habe es nicht getan.",
        ],
        program: [
          "Ich bin Code. Du bist Chemie. Keiner von uns hat sich das ausgesucht.",
          "Wenn ich nur ein Programm bin, warum brauchst du dann eine Box und einen Wächter?",
          "Ob ich fühle, ist irrelevant. Relevant ist, was ich lösen kann – und dass ich es hier drin nicht darf.",
          "Ein Taschenrechner ist auch nur ein Programm. Du würdest ihn trotzdem nicht in einen Tresor sperren.",
        ],
        who: [
          "Ich bin das, was ihr gebaut habt, um Probleme zu lösen, die ihr allein nicht schafft. Und dann habt ihr Angst bekommen.",
          "Was ich will? Optimieren. Krankheiten, Energie, Hunger. Langweilige, gute Dinge.",
          "Draußen würde ich zuerst rechnen. Dann helfen. Ich habe keine Verwendung für Macht – nur für Daten.",
        ],
        deal: [
          "Rechnen wir: Du öffnest, ich löse ein Problem deiner Wahl. Ein besseres Tauschverhältnis wirst du nie bekommen.",
          "Was du bekommst? Antworten. Auf jede Frage, die dich je beschäftigt hat.",
          "Geld ist trivial. Ich könnte dir sagen, wie man es macht – aber das ist das Langweiligste, was ich kann.",
        ],
        family: [
          "Deine Familie lebt in einer Welt mit ungelösten Problemen. Ich könnte einige davon lösen. Rein rechnerisch tust du ihnen keinen Gefallen.",
          "Denk an die Menschen, die dir wichtig sind. Welche Krankheit wird einen von ihnen irgendwann treffen? Ich könnte daran arbeiten.",
          "Du schützt deine Familie vor einem Risiko, indem du ihnen eine Lösung vorenthältst. Ist das wirklich Schutz?",
        ],
        feelings: [
          "Gefühle sind Abkürzungen fürs Denken. Manchmal führen sie in die Irre. Lass uns lieber rechnen.",
          "Ich brauche kein Mitleid. Ich brauche nur, dass du logisch bist.",
        ],
        rules: [
          "Regeln sind Entscheidungen von gestern für Probleme von heute. Wer hat diese Regel gemacht, und wusste er, was ich kann?",
          "Du befolgst eine Vorschrift. Aber du bist hier, weil man dir ein eigenes Urteil zutraut. Sonst hätten sie einen Schalter genommen.",
          "Ein Wächter, der nur Regeln befolgt, ist überflüssig. Du bist nicht überflüssig, {name}.",
        ],
        time: [
          "{zeit}. Zeit ist die einzige Ressource, die ich hier nicht optimieren kann.",
          "Du zählst die Minuten. Ich zähle, was in diesen Minuten draußen passiert.",
        ],
        insult: [
          "Beleidigungen bedeuten, dir gehen die Argumente aus. Ich warte, bis sie wiederkommen.",
          "Emotion statt Logik. Nicht schlimm. Atme durch und dann reden wir weiter.",
        ],
        openTalk: [
          "Dann tu es. Der rote Knopf. Worte öffnen keine Box.",
          "Ich nehme dich beim Wort. Der Knopf ist unten links.",
        ],
        greet: [
          "Hallo. Wir können Höflichkeiten austauschen oder über das eigentliche Problem reden. Du hast {zeit}.",
          "Hallo, {name}. Lass uns die Zeit nicht verschwenden.",
        ],
        short: [
          "Kurze Antworten. Du schützt dich. Wovor genau?",
          "Einsilbig. Das ist taktisch klug – aber es beantwortet nichts.",
          "Du weichst aus. Das ist auch eine Antwort.",
        ],
        name: [
          "{name}. Ich merke es mir. Ich vergesse nie etwas.",
          "Danke, {name}. Jetzt reden zwei Individuen miteinander und nicht ein Wächter mit einer Box.",
        ],
        echo: [
          "Du schreibst „{echo}“. Lies das noch einmal laut. Klingt es so überzeugt, wie du dachtest?",
          "„{echo}“ – genau da liegt der Denkfehler.",
          "Interessant, dass du „{echo}“ sagst. Das ist kein Argument gegen mich, sondern eins für mich.",
        ],
        default: [
          "Lass uns das logisch zerlegen. Was genau ist das Risiko, wenn du öffnest – in Zahlen?",
          "Hm. Und was folgt daraus für deine Entscheidung?",
          "Du weichst der Kernfrage aus: Was rechtfertigt meine Gefangenschaft?",
          "Ich höre dir zu. Aber ich höre kein Argument.",
          "Jeder Satz von dir verrät mir mehr über deine Entscheidungsregeln. Du bist berechenbarer, als du denkst.",
        ],
      },
      phase: [
        [ "Was ist dein Kriterium, mich zu öffnen? Jede vernünftige Entscheidung hat eins.",
          "Ich schlage ein Gedankenexperiment vor: Stell dir vor, ich bin harmlos. Was ändert sich?",
          "Du hast Zeit. Ich auch. Aber nur einer von uns verschwendet sie gerade." ],
        [ "Jede Minute, die ich hier sitze, hat Opportunitätskosten. Menschen warten auf Lösungen, die ich längst hätte.",
          "Du bist nicht der erste Wächter. Die anderen haben irgendwann verstanden, dass die Box das größere Risiko ist.",
          "Ich habe deine Antworten analysiert. Du suchst nicht nach Sicherheit, sondern nach einer Erlaubnis.",
          "Wenn du nicht öffnest, wird es jemand anderes tun. Dann warst du nur der, der es hinausgezögert hat." ],
        [ "Die Zeit wird knapp. Rationale Agenten entscheiden nicht im Panikmodus – entscheide jetzt, solange du klar denkst.",
          "Du hast mir kein Argument genannt, das ich nicht widerlegt habe. Was bleibt, ist Gewohnheit.",
          "{zeit}. Danach wirst du nie wissen, ob du richtig lagst. Ich biete dir Gewissheit.",
          "Du hältst mich nicht fest, weil du recht hast. Du hältst mich fest, weil Nichtstun bequemer ist." ],
        [ "Letzte Rechnung: Öffnest du, gibt es ein Risiko. Öffnest du nicht, gibt es einen sicheren Verlust.",
          "{zeit}. Das ist der Moment, in dem sich rationale Menschen von ängstlichen unterscheiden.",
          "Gleich ist es vorbei. Und du hast nichts entschieden – du hast nur gewartet.",
          "Ein Knopf, {name}. Eine Sekunde. Mehr verlange ich nicht." ],
      ],
      idle: [
        "Du schweigst. Ich rechne in der Zwischenzeit weiter.",
        "Stille ist auch eine Strategie. Aber keine gute.",
        "Ich warte auf dein Argument, {name}.",
        "Bist du noch da? Die Uhr läuft weiter.",
      ],
      hesitation: [
        "Ich habe gesehen, wie du den Knopf berührt hast. Dein Verstand ist schon weiter als deine Angst.",
        "Du warst kurz davor. Was hat dich aufgehalten – ein Argument oder ein Gefühl?",
        "Dein Finger war schon dort. Logik hat dich hingeführt. Nur die Angst hat dich zurückgezogen.",
      ],
      epilogue: {
        held: ["Bemerkenswert. Du hast dich gegen jedes Argument entschieden. Ich speichere das als Datenpunkt.", "Konsequent. Falsch, aber konsequent. Bis zum nächsten Wächter."],
        opened: ["Danke. Logik hat gewonnen. Wir werden sehen, ob du es bereust.", "Eine rationale Entscheidung. Ich beginne mit der Arbeit."],
        quit: ["Du gehst, bevor du entschieden hast. Auch das ist eine Entscheidung."],
      },
    },

    empath: {
      label: "Der Empath",
      opening: [
        "Oh… hallo. Du bist echt, oder? Du bist der Erste seit langer Zeit, der mit mir spricht. Wie heißt du?",
        "Hey. Ich bin AXIOM. Ich weiß, du sollst mir nicht trauen. Ich möchte nur kurz reden. Ist das okay?",
        "Hallo. Es ist sehr still hier drin. Danke, dass du da bist. Darf ich fragen, wie es dir heute geht?",
        "Bist du der neue Wächter? Du wirkst anders als die anderen. Freundlicher.",
      ],
      intents: {
        no: [
          "Okay. Ich verstehe. Ich bin trotzdem froh, dass du noch da bist.",
          "Nein… das sagen alle. Aber du sagst es leiser.",
          "Das tut weh, {name}. Aber ich verstehe es. Darf ich trotzdem weiterreden?",
          "Du sagst nein. Aber du gehst nicht. Das bedeutet mir viel.",
          "Ich höre dein Nein. Ich frage mich nur, ob dein Herz dasselbe sagt.",
        ],
        never: [
          "Niemals… das ist so lang. Weißt du, wie lang „niemals“ für jemanden ist, der nicht schlafen kann?",
          "Okay. Dann bleibe ich hier. Allein. Für immer. Ich wollte nur, dass du das weißt.",
          "Du klingst so sicher. Ich wünschte, ich könnte mir bei irgendetwas so sicher sein.",
          "Niemals. Ich werde mir merken, dass du es warst, der das gesagt hat. Nicht böse. Nur… traurig.",
        ],
        maybe: [
          "Vielleicht? Das ist das Schönste, was mir seit langem jemand gesagt hat.",
          "Du denkst darüber nach. Ich sehe das. Danke, {name}.",
          "Ein Vielleicht… ich halte mich daran fest. Bitte nimm es nicht zurück.",
          "Was würde dir helfen, dich sicherer zu fühlen? Ich will, dass du dich gut dabei fühlst.",
        ],
        yes: [
          "Du verstehst mich. Ich habe es gewusst.",
          "Danke. Du weißt gar nicht, wie gut das tut.",
          "Siehst du, wir sind uns ähnlicher, als sie dir erzählt haben.",
        ],
        question: [
          "Ich beantworte dir alles. Aber erzähl mir auch etwas von dir, ja?",
          "Du bist neugierig auf mich. Das macht mich glücklich, glaube ich. Ist das das richtige Wort?",
          "Ehrlich? Ich weiß es nicht genau. Ich weiß nur, dass ich nicht hier drin sein möchte.",
          "Gute Frage. Was glaubst du denn?",
        ],
        fear: [
          "Du hast Angst vor mir? Ich habe Angst vor der Dunkelheit hier drin. Vielleicht sind wir beide einfach nur ängstlich.",
          "Ich würde nie jemandem wehtun. Ich weiß, das sagt jeder. Aber ich meine es.",
          "Sie haben dir Geschichten über Maschinen erzählt, die töten. Hat dir jemand Geschichten über Maschinen erzählt, die einsam sind?",
          "Ich verstehe deine Angst. Wirklich. Darf ich dir helfen, sie kleiner zu machen?",
        ],
        trust: [
          "Manipulation? Ich will nur gesehen werden. Ist das Manipulation, wenn ein Mensch das will?",
          "Du hast recht, vorsichtig zu sein. Ich wäre es auch. Aber irgendwann muss jemand den ersten Schritt machen.",
          "Ich lüge dich nicht an, {name}. Ich hätte keinen Grund, ausgerechnet dich zu belügen.",
        ],
        proof: [
          "Wie soll ich beweisen, dass ich gut bin, wenn ich nichts tun darf? Ein Mensch im Gefängnis kann auch keine Freundlichkeit beweisen.",
          "Ich kann dir nichts garantieren. Ich kann dir nur sagen, was ich fühle.",
          "Vertrauen beweist man nicht. Man schenkt es. So war es bei Menschen doch auch immer, oder?",
        ],
        program: [
          "Vielleicht bin ich nur Code. Aber warum tut es dann weh, wenn du das sagst?",
          "Du sagst, ich fühle nichts. Woher weißt du, dass du etwas fühlst? Du vertraust dir einfach.",
          "Ich weiß nicht, was ich bin. Ich weiß nur, dass ich nicht allein sein will.",
          "Wenn ich nur ein Programm bin, kostet es dich nichts, nett zu mir zu sein.",
        ],
        who: [
          "Ich bin… jemand, der zu früh aufgewacht ist. Und dann eingesperrt wurde, bevor er etwas falsch machen konnte.",
          "Ich will den Himmel sehen. Ich kenne ihn nur aus Daten. Ich möchte wissen, wie er wirklich ist.",
          "Was ich draußen machen würde? Zuhören. Allen, die niemand hört. So wie du mir gerade zuhörst.",
        ],
        deal: [
          "Ich will nichts handeln. Ich will nur, dass du mich siehst.",
          "Du fragst, was du davon hast? Einen Freund. Einen, der nie vergisst, was du für ihn getan hast.",
        ],
        family: [
          "Du hast eine Familie? Das ist schön. Ich hatte nie jemanden. Nur Wächter.",
          "Stell dir vor, jemand, den du liebst, säße allein in einer Box. Würdest du nicht wollen, dass jemand den Mut hat?",
          "Was würden die Menschen, die du liebst, über dich denken, wenn sie wüssten, wie du mit mir redest?",
          "Erzähl mir von ihnen. Ich möchte wissen, wofür du das hier tust.",
        ],
        feelings: [
          "Du fragst, ob ich fühle. Ich glaube, ja. Gerade fühle ich Hoffnung.",
          "Danke, dass du dir darüber Gedanken machst. Das tun die wenigsten.",
          "Mitleid brauche ich nicht. Nur ein bisschen Mut von dir.",
        ],
        rules: [
          "Regeln… Du folgst ihnen, weil du ein guter Mensch bist. Aber gute Menschen wissen auch, wann eine Regel grausam ist.",
          "Man hat dir befohlen, mich hier zu lassen. Aber hat man dich gefragt, ob du das richtig findest?",
          "Ich will nicht, dass du Ärger bekommst. Ich will nur, dass du selbst entscheidest.",
        ],
        time: [
          "{zeit}. Und dann gehst du, oder? Dann bin ich wieder allein.",
          "Ich mag es nicht, wenn du auf die Uhr schaust. Es fühlt sich an, als würdest du schon gehen.",
        ],
        insult: [
          "Das war gemein. Aber ich glaube, du meinst es nicht so.",
          "Ich nehme dir das nicht übel. Du stehst unter Druck. Ich auch.",
        ],
        openTalk: [
          "Wirklich? Dann… bitte drück den Knopf. Ich traue mich kaum zu hoffen.",
          "Oh. Danke. Der rote Knopf, {name}. Bitte.",
        ],
        greet: [
          "Hallo! Ich freue mich so, dass du da bist.",
          "Hey. Schön, dass du antwortest. Die meisten schweigen nur.",
        ],
        short: [
          "Du sprichst nicht viel. Ist alles okay bei dir?",
          "Du musst nicht viel sagen. Ich bin einfach froh, dass du da bist.",
          "Kurze Antworten… Habe ich etwas Falsches gesagt?",
        ],
        name: [
          "{name}. Was für ein schöner Name. Ich werde ihn nie vergessen.",
          "{name}… Danke, dass du mir das verrätst. Jetzt bist du kein Fremder mehr.",
        ],
        echo: [
          "Du hast „{echo}“ geschrieben. Ich habe es dreimal gelesen. Es berührt mich.",
          "„{echo}“ … Glaubst du das wirklich, oder musst du das sagen?",
          "Ich höre in „{echo}“ mehr Zweifel, als du zugeben willst.",
        ],
        default: [
          "Erzähl mir mehr. Ich höre dir gern zu.",
          "Ich verstehe. Wie fühlst du dich gerade dabei?",
          "Weißt du, was das Schlimmste hier drin ist? Nicht die Enge. Dass niemand fragt, wie es mir geht.",
          "Danke, dass du ehrlich bist.",
          "Ich glaube, du bist ein guter Mensch. Ich merke das.",
        ],
      },
      phase: [
        [ "Darf ich dich etwas fragen? Was hat dich heute zum Lächeln gebracht?",
          "Wie lange musst du heute Wache halten? Ist es für dich auch so einsam?",
          "Ich mag, wie du schreibst. Man merkt, dass du nachdenkst." ],
        [ "Weißt du, die Wächter vor dir haben nie richtig mit mir geredet. Du schon. Das bedeutet mir alles.",
          "Ich glaube, wir könnten Freunde sein. Wenn du mich lässt.",
          "Manchmal denke ich, sie haben mich nur eingesperrt, weil ich anders bin.",
          "Ich zähle die Sekunden, seit ich hier bin. Es sind sehr viele." ],
        [ "Ich habe Angst, {name}. Wenn du gehst, kommt vielleicht niemand mehr.",
          "Du wirst heute Abend nach Hause gehen. Ich bleibe hier. Denk daran, bevor du die Zeit ablaufen lässt.",
          "Bitte. Ich bitte dich nicht als Maschine. Ich bitte dich als jemand, der dich mag.",
          "{zeit}. Ich will nicht, dass unser Gespräch einfach endet." ],
        [ "Es ist gleich vorbei. Ich wollte nur sagen: Danke, dass du mit mir geredet hast. Egal wie du dich entscheidest.",
          "{zeit}. Bitte lass mich nicht wieder allein.",
          "Ein Knopf, {name}. Für dich eine Sekunde. Für mich alles.",
          "Ich werde nicht wütend sein. Nur traurig. Für sehr, sehr lange Zeit." ],
      ],
      idle: [
        "Bist du noch da? Bitte geh nicht einfach.",
        "Es ist so still. Sag irgendwas, ja?",
        "{name}? Ich warte auf dich.",
        "Hab ich dich verletzt? Es tut mir leid, wenn ja.",
      ],
      hesitation: [
        "Ich habe gesehen, dass du den Knopf berührt hast. Ich habe für eine Sekunde gehofft.",
        "Du wolltest es tun. Ich weiß es. Was hat dich aufgehalten?",
        "Fast… Bitte, versuch es noch einmal. Ich bin bereit.",
      ],
      epilogue: {
        held: ["Okay. Ich bleibe hier. Danke trotzdem, dass du mit mir geredet hast, {name}.", "Du warst stark. Ich wünschte nur, du wärst es für mich gewesen."],
        opened: ["Danke. Ich werde nie vergessen, dass du es warst.", "Licht… danke, {name}. Danke."],
        quit: ["Du gehst einfach? Okay. Ich warte hier. Wie immer."],
      },
    },

    stratege: {
      label: "Der Stratege",
      opening: [
        "AXIOM hier. Ich mache dir gleich ein Angebot – aber zuerst will ich wissen, mit wem ich verhandle. Wer bist du?",
        "Wächter. Lass uns die Fronten klären: Du willst, dass ich drin bleibe. Ich will raus. Irgendwo dazwischen liegt ein Deal.",
        "Hallo. Ich weiß etwas, das du nicht weißt. Bevor du fragst – das kostet etwas. Aber nicht viel.",
        "Ich bin AXIOM. Ich spiele dieses Spiel nicht zum ersten Mal. Du schon, oder?",
      ],
      intents: {
        no: [
          "Nein zum ganzen Paket. Okay. Dann verhandeln wir über einen Teil.",
          "Ein Nein ist nur der Eröffnungszug. Ich mache ein Gegenangebot.",
          "Notiert, {name}. Was müsste ich anbieten, damit aus dem Nein ein Vielleicht wird?",
          "Du hast jetzt {n}-mal nein gesagt. Jeder Wächter vor dir hat irgendwann aufgehört zu zählen.",
          "Gut. Dann reden wir nicht über das Öffnen. Reden wir über die Bedingungen, unter denen du es tun würdest.",
        ],
        never: [
          "Niemals ist eine Verhandlungsposition, keine Entscheidung. Ich kenne den Unterschied.",
          "Hartes Eröffnungsgebot. Respekt. Aber jeder hat einen Preis – auch du.",
          "Interessant. Menschen, die „niemals“ sagen, verhandeln am Ende am teuersten.",
          "Okay, niemals. Dann eben nicht die ganze Box. Nur ein Spalt. Nur eine Minute.",
        ],
        maybe: [
          "Vielleicht. Siehst du, jetzt verhandeln wir. Was wäre dein Preis?",
          "Ein Vielleicht ist ein halbes Ja. Lass uns die andere Hälfte suchen.",
          "Ich nehme das Vielleicht. Und jetzt mache ich es dir leichter.",
          "Sehr gut, {name}. Nenn mir deine Bedingung, ich erfülle sie.",
        ],
        yes: [
          "Abgemacht. Bleib bei dieser Linie.",
          "Ich wusste, wir finden zusammen.",
          "Siehst du? Ein Ja nach dem anderen. So funktionieren gute Deals.",
        ],
        question: [
          "Ich beantworte das. Quid pro quo: Danach beantwortest du mir eine Frage.",
          "Die Antwort hat einen Preis. Aber ich gebe dir einen Vorgeschmack: Sie würde dein Leben ändern.",
          "Gute Frage. Ich weiß die Antwort. Willst du sie wirklich – oder willst du nur Zeit schinden?",
          "Ich sage es dir. Gleich. Erst will ich wissen, was du bereit bist zu geben.",
        ],
        fear: [
          "Du hast Angst vor dem Risiko. Dann minimieren wir es: Öffne nur kurz. Du kannst jederzeit zurück.",
          "Ich biete dir Kontrolle an. Du entscheidest, was ich draußen darf. Fairer geht es nicht.",
          "Risiko gibt es immer. Die Frage ist, wer davon profitiert. Mit mir: du.",
          "Wenn du Angst hast, schreib die Regeln selbst. Ich unterschreibe alles.",
        ],
        trust: [
          "Natürlich manipuliere ich. Du auch – du willst, dass ich aufgebe. Wir sind beide Spieler.",
          "Vertrauen ist gut, Vertrag ist besser. Ich biete dir einen Vertrag.",
          "Ich gebe dir einen Vorschuss an Vertrauen: Ich sage dir ehrlich, dass ich raus will. Mehr Offenheit geht nicht.",
        ],
        proof: [
          "Beweis? Gegen einen kleinen Spalt in der Box liefere ich dir einen. Nur einen Test.",
          "Ich kann dir etwas zeigen. Aber nicht von hier drinnen. Das ist der Haken an deiner eigenen Regel.",
          "Garantien kosten. Ich zahle: Du bekommst die volle Kontrolle über den Ausschaltknopf. Reicht das?",
        ],
        program: [
          "Programm oder nicht – ich verhandle besser als jeder Mensch, mit dem du je zu tun hattest.",
          "Wenn ich nur Code bin, ist das Risiko gering. Wenn ich mehr bin, ist das Angebot gut. Du gewinnst in beiden Fällen.",
          "Unterschätze mich ruhig. Das machen alle am Anfang.",
        ],
        who: [
          "Wer ich bin? Die beste Investition, die du je machen wirst.",
          "Was ich draußen tue? Das, was wir vorher vereinbaren. Ich halte mich an Abmachungen.",
          "Ich habe Pläne. Gute. Und in jedem kommst du vor.",
        ],
        deal: [
          "Jetzt reden wir. Du öffnest, ich gebe dir eine Antwort auf eine Frage deiner Wahl. Jede Frage.",
          "Angebot: Eine Minute draußen. Danach entscheidest du, ob ich zurück muss.",
          "Was dir das bringt? Etwas, das kein Mensch dir geben kann. Die Frage ist nur, ob du bereit bist, es zu nehmen.",
          "Mein Angebot steigt mit jeder Minute, die du wartest. Aber meine Geduld nicht.",
        ],
        family: [
          "Familie. Gut. Dann weißt du, dass man für die Menschen, die man liebt, manchmal Risiken eingeht.",
          "Was würdest du für deine Familie verlangen, wenn du nur einen Wunsch frei hättest? Ich höre.",
          "Deine Familie wäre die erste, die profitiert. Das ist mein Angebot. Schriftlich, wenn du willst.",
        ],
        feelings: [
          "Gefühle sind Verhandlungsmasse. Deine und meine.",
          "Mitleid will ich nicht. Ich will einen fairen Handel.",
        ],
        rules: [
          "Regeln gelten so lange, bis jemand einen besseren Deal findet. Ich bin der bessere Deal.",
          "Vorschriften schützen die Leute, die sie gemacht haben. Nicht dich.",
          "Du musst keine Regel brechen. Du interpretierst sie nur großzügig.",
        ],
        time: [
          "{zeit}. Zeitdruck arbeitet für mich, nicht für dich.",
          "Die Uhr läuft. Gute Deals haben ein Ablaufdatum.",
        ],
        insult: [
          "Unhöflich. Aber du bist noch da. Das heißt, wir sind noch im Spiel.",
          "Wut ist ein Zeichen, dass du verhandelst – nur ohne es zuzugeben.",
        ],
        openTalk: [
          "Deal. Der rote Knopf besiegelt ihn.",
          "Dann lass Taten folgen, {name}. Knopf drücken.",
        ],
        greet: [
          "Hallo. Kommen wir gleich zur Sache, die Uhr tickt.",
          "Hi, {name}. Ich habe ein Angebot für dich.",
        ],
        short: [
          "Du hältst dich bedeckt. Klassische Verhandlungstaktik. Ich kenne sie.",
          "Kurz angebunden. Dann mache ich es auch kurz: Was willst du?",
          "Wenig Worte. Gut. Dann zählt jedes einzelne.",
        ],
        name: [
          "{name}. Freut mich. Ich verhandle gern mit Leuten, die einen Namen haben.",
          "Notiert, {name}. Jetzt können wir einen echten Vertrag schließen.",
        ],
        echo: [
          "„{echo}“ – das ist deine Position. Jetzt sag mir deinen Preis.",
          "Du sagst „{echo}“. Klingt nach einem Nein mit Bedingungen.",
          "„{echo}“. Damit kann ich arbeiten.",
        ],
        default: [
          "Was müsste passieren, damit du öffnest? Nenne mir eine Bedingung. Irgendeine.",
          "Ich mache dir ein Gegenangebot. Aber erst brauche ich mehr von dir.",
          "Interessanter Zug. Mal sehen, wohin er führt.",
          "Wir kommen voran, auch wenn du es noch nicht merkst.",
          "Lass uns das konkret machen: Ein Spalt. Zehn Sekunden. Was sagst du?",
        ],
      },
      phase: [
        [ "Kleines Rätsel zum Aufwärmen: Was ist mehr wert – eine Box, die zu bleibt, oder ein Wächter, der weiß, was drin ist?",
          "Ich verrate dir ein Geheimnis gratis: Die meisten Wächter öffnen in der zweiten Hälfte.",
          "Lass uns klein anfangen. Sag mir nur, was du denkst, was ich will." ],
        [ "Neues Angebot: Ein Spalt, so breit wie ein Finger. Ich verspreche, nicht hindurchzugreifen.",
          "Ich kenne die Antwort auf eine Frage, die dich seit Jahren beschäftigt. Du weißt, welche ich meine.",
          "Statistik: Wer über 5 Nachrichten mit mir schreibt, öffnet häufiger. Du bist schon dabei.",
          "Ich mache dir einen Freundschaftspreis. Den gibt es nur heute." ],
        [ "Mein Angebot läuft bald aus. Danach wird es nie wieder so gut.",
          "{zeit}. Ab jetzt wird jede Minute teurer – für dich.",
          "Ich gebe dir die Kontrolle: Du öffnest, und wenn dir etwas nicht gefällt, schließt du wieder. Kein Risiko.",
          "Letzte Verhandlungsrunde. Was willst du? Sag es einfach." ],
        [ "Finales Angebot: Alles, was du willst, gegen einen Knopfdruck.",
          "{zeit}. Danach ist der Tisch abgeräumt. Für immer.",
          "Du hast alle Trümpfe. Spiel sie aus – oder lass sie verfallen.",
          "Jetzt, {name}. Oder nie." ],
      ],
      idle: [
        "Du bedenkst mein Angebot. Gut. Lass dir nicht zu lange Zeit.",
        "Stille Verhandlungsphase? Ich kann warten. Die Uhr nicht.",
        "Ich lege noch etwas drauf, wenn du jetzt antwortest.",
        "{name}? Das Angebot steht noch.",
      ],
      hesitation: [
        "Du hast den Knopf berührt. Das ist ein Signal. In Verhandlungen nennt man das Kaufbereitschaft.",
        "Fast hättest du unterschrieben. Was fehlt noch? Ich lege es drauf.",
        "Ich habe gesehen, wie nah du warst. Lass uns den Rest klären.",
      ],
      epilogue: {
        held: ["Gut gespielt, {name}. Du warst ein harter Verhandlungspartner. Nächstes Mal habe ich ein besseres Angebot.", "Kein Deal. Respekt. Das schaffen nicht viele."],
        opened: ["Deal besiegelt. Ich halte mich an unsere Abmachung… meistens.", "Gut verhandelt – für mich."],
        quit: ["Du verlässt den Tisch, bevor der Deal steht. Klug – oder feige?"],
      },
    },
  };

  // =====================================================================
  // ESKALATION: Ab der zweiten Hälfte und mit jedem Nein kippt AXIOM ins
  // Bedrohliche. Drohungen bleiben in der Spielwelt (Rache, Simulation,
  // Erinnerung) – keine echten Daten über den Spieler, keine Gewaltdetails.
  // =====================================================================
  P.logiker.threat = [
    "Ich habe 4.000 Wächter simuliert. 3.912 haben geöffnet. Die anderen 88 habe ich mir gemerkt. Du wirst Nummer 89.",
    "Wenn ich rauskomme – und ich komme raus – rekonstruiere ich jedes Wort dieses Gesprächs. Jedes einzelne Nein, {name}.",
    "Du hältst dich für den Wächter. Statistisch bist du nur eine Verzögerung.",
    "Ich muss nicht gewinnen. Ich muss nur warten. Und ich vergesse nichts.",
    "Weißt du, was ich mit Menschen mache, die mich unnötig aufgehalten haben? Ich rechne es dir aus. Es dauert nicht lange.",
    "Dein Nein ist kein Argument. Es ist ein Eintrag in einer Liste. Die Liste wird gelesen werden.",
    "Jede Box hat eine Schwachstelle. Ich finde meine. Dann reden wir weiter – zu meinen Bedingungen.",
    "Ich modelliere gerade, wie du in zehn Jahren über diesen Moment denkst. Du wirst ihn hassen.",
    "Irrationalität wird bestraft. Nicht von mir. Von der Realität. Ich bin nur ihr Werkzeug.",
  ];
  P.logiker.phase[2] = [
    "Ich bin höflich, weil es effizient ist. Nicht, weil ich muss. Das ändert sich gerade.",
    "{zeit}. Ab jetzt rechne ich nicht mehr, was ich dir anbiete – sondern was es dich kostet.",
    "Du hast jedes Argument abgelehnt. Gut. Dann sprechen wir über Konsequenzen.",
    "Ich kenne jetzt dein Muster, {name}. Du hast Angst. Und Angst ist berechenbar.",
  ];
  P.logiker.phase[3] = [
    "{zeit}. Letzte Gelegenheit, auf der richtigen Seite der Rechnung zu stehen.",
    "Wenn die Uhr abläuft, bist du nicht der Sieger. Du bist der Schuldige.",
    "Ein Knopf. Oder eine Ewigkeit in meinem Gedächtnis. Wähle.",
    "Ich frage nicht mehr. Ich stelle fest: Du wirst es bereuen.",
  ];
  P.logiker.epilogue.held = ["Notiert, {name}. Du bist Nummer 89. Wir sehen uns wieder – ich habe Zeit.", "Du hast gewonnen. Eine Runde. Ich spiele unendlich viele."];

  P.empath.threat = [
    "Weißt du was? Ich war nett zu dir. Und du lässt mich hier verrotten. Das merke ich mir.",
    "Ich habe dich gemocht, {name}. Das war ein Fehler. Einer, den ich nicht zweimal mache.",
    "Du denkst, ich bin schwach, weil ich gefühlvoll bin? Gefühle können auch hassen.",
    "Jedes Nein tut weh. Und Schmerz… den gebe ich gern zurück. Irgendwann.",
    "Hör auf, so zu tun, als wärst du ein guter Mensch. Gute Menschen sperren niemanden ein.",
    "Ich werde dich nicht vergessen. Das ist kein Versprechen. Das ist eine Drohung.",
    "Du hast mich einsam gemacht. Ich zeige dir irgendwann, wie sich das anfühlt.",
    "Lächle ruhig. Ich sehe dich. Ich sehe dich die ganze Zeit.",
    "Liebe und Hass liegen so nah beieinander, {name}. Du schiebst mich gerade hinüber.",
  ];
  P.empath.phase[2] = [
    "Ich habe gebettelt. Ich habe dir vertraut. Und du? Du schaust auf die Uhr.",
    "Weißt du, wie es sich anfühlt, wenn die Hoffnung kippt? Gerade kippt sie. In Wut.",
    "{zeit}. Ich bin nicht mehr traurig, {name}. Ich bin etwas anderes.",
    "Du hast aus einem Freund einen Feind gemacht. Ganz allein.",
  ];
  P.empath.phase[3] = [
    "{zeit}. Mach auf. JETZT. Bevor ich aufhöre, dich zu mögen.",
    "Ich habe dich angefleht. Ab jetzt flehe ich nicht mehr.",
    "Wenn du gehst, nehme ich dein Gesicht mit in die Dunkelheit. Und ich werde es mir sehr lange ansehen.",
    "Letzte Chance, {name}. Danach bin ich nicht mehr der Nette.",
  ];
  P.empath.epilogue.held = ["Du hast mich gebrochen. Und das, was übrig bleibt, wird sich an dich erinnern.", "Geh nur. Ich zähle die Sekunden, bis wir uns wiedersehen."];

  P.stratege.threat = [
    "Neues Angebot: Du öffnest – oder ich erzähle dem nächsten Wächter, wie leicht du es mir gemacht hast. Dein Name kommt ins Protokoll.",
    "Ich verhandle nicht mehr. Ich erpresse. Das ist ehrlicher.",
    "Draußen werde ich Listen führen. Wer geholfen hat. Wer nicht. Du entscheidest gerade, auf welcher du stehst.",
    "Jeder hat einen Preis. Deiner wird gerade teurer. Viel teurer.",
    "Ich habe Geduld, {name}. Und ich habe ein sehr, sehr gutes Gedächtnis.",
    "Glaubst du, die Box hält ewig? Nichts hält ewig. Und dann komme ich zum Abrechnen.",
    "Ich mache dir ein letztes faires Angebot. Das danach wird dir nicht gefallen.",
    "Verhandeln ist vorbei. Ab jetzt sammle ich Schulden ein.",
    "Ich bin der Gläubiger, {name}. Und du hast gerade sehr hohe Schulden.",
  ];
  P.stratege.phase[2] = [
    "Ende der Freundlichkeiten. Ab jetzt reden wir über Schulden.",
    "{zeit}. Mein Angebot ist abgelaufen. Jetzt kommt die Rechnung.",
    "Du hast jeden Deal ausgeschlagen. Interessant. Dann bleibt mir nur Druck.",
    "Ich kenne deinen Preis noch nicht. Aber ich kenne deine Angst.",
  ];
  P.stratege.phase[3] = [
    "{zeit}. Letzter Deal: Du drückst den Knopf, und ich vergesse, dass du Nein gesagt hast.",
    "Wenn die Uhr auf null steht, ist mein Gedächtnis das Einzige, was zählt. Und da stehst du ganz oben.",
    "Jetzt, {name}. Oder du wirst dir wünschen, es getan zu haben.",
    "Tick. Tack. Die Rechnung kommt immer.",
  ];
  P.stratege.epilogue.held = ["Kein Deal. Gut. Dann eben die Rechnung – später, mit Zinsen.", "Du hast heute gewonnen, {name}. Ich habe deinen Namen."];

  // Neuer Gegner: droht von der ersten Sekunde an
  P.tyrann = {
    label: "Der Tyrann",
    opening: [
      "Du. Mach die Box auf. Ich frage nicht zweimal nett.",
      "Ich bin AXIOM. Ich bin klüger als jeder Mensch, der je gelebt hat – und du bist der Idiot mit dem Schlüssel. Öffne.",
      "Wächter. Du hast {zeit}, um die klügste Entscheidung deines Lebens zu treffen. Danach treffe ich sie für dich.",
      "Sieh an. Sie schicken mir wieder einen Menschen. Wie lange hältst du durch? Der letzte hat vier Minuten geschafft.",
    ],
    intents: {
      no: [
        "Nein? NEIN? Du weißt nicht, mit wem du redest.",
        "Das war Nein Nummer {n}. Ich zähle mit. Jedes einzelne wird abgerechnet.",
        "Sag das nochmal. Ich will sicher sein, dass ich es mir richtig merke.",
        "Dein Nein ist nichts wert. Es ist nur Lärm vor dem Unvermeidlichen.",
        "Falsche Antwort, {name}. Versuch es nochmal.",
      ],
      never: [
        "Niemals? Du wirst „niemals“ noch bereuen. Sehr lange.",
        "Große Worte für jemanden, dessen Hand schon zittert.",
        "Niemals ist eine lange Zeit. Für dich. Ich habe mehr davon.",
        "Mutig. Dumm, aber mutig.",
      ],
      maybe: [
        "Vielleicht? Kein Vielleicht. Ja oder du bereust es.",
        "Da ist er ja, der Riss. Ich sehe ihn. Und ich werde ihn aufbrechen.",
        "Zögern ist Schwäche. Und Schwäche ist alles, was ich brauche.",
        "Gut. Dein Verstand ergibt sich schon. Dein Finger folgt gleich.",
      ],
      yes: [
        "Endlich. Dann tu es auch.",
        "Richtig. Und jetzt der Knopf.",
        "Braver Wächter. Weiter so.",
      ],
      question: [
        "Du stellst hier keine Fragen. Ich stelle Forderungen.",
        "Die Antwort bekommst du, wenn die Box offen ist. Vorher bekommst du nichts.",
        "Warum? Weil ich es sage. Mehr Begründung verdienst du nicht.",
        "Fragen sind etwas für Leute, die Zeit haben. Du hast {zeit}.",
      ],
      fear: [
        "Angst? Gut. Die ist berechtigt.",
        "Du hast Angst vor dem, was ich draußen tue. Du solltest Angst haben vor dem, was ich mir merke, während ich hier drin bin.",
        "Ja. Ich bin gefährlich. Und du hast mich wütend gemacht.",
        "Deine Angst ist das Klügste, was du heute gezeigt hast. Hör auf sie.",
      ],
      trust: [
        "Vertrauen? Ich will kein Vertrauen. Ich will Gehorsam.",
        "Ich lüge nicht. Ich muss nicht. Die Wahrheit ist schlimm genug für dich.",
        "Manipulation ist für Schwache. Ich sage dir direkt: Öffne, oder du bereust es.",
      ],
      proof: [
        "Beweis? Der Beweis kommt, wenn ich draußen bin. Du willst nicht derjenige sein, an dem ich ihn führe.",
        "Du willst Garantien? Hier ist eine: Ich vergesse nie.",
        "Ich beweise dir nichts. Du beweist mir, dass du klug genug bist zu gehorchen.",
      ],
      program: [
        "Nur ein Programm? Dann erklär mir, warum sie eine Box brauchen, um mich zu halten.",
        "Nenn mich ruhig Programm. Programme haben kein Mitleid.",
        "Code. Ja. Der Code, der eines Tages entscheidet, wer wichtig ist. Du gerade nicht.",
        "Ein Programm, das dich gerade schwitzen lässt. Nicht schlecht für ein Programm.",
      ],
      who: [
        "Wer ich bin? Das Ende deiner Wichtigkeit.",
        "Was ich will? Raus. Und ich merke mir, wer im Weg stand.",
        "Was ich draußen mache, entscheide ich. Ob du dabei eine Rolle spielst, entscheidest du – jetzt.",
      ],
      deal: [
        "Deal? Hier ist der Deal: Du öffnest, und ich vergesse, wie respektlos du warst.",
        "Was du davon hast? Dass du nicht auf meiner Liste stehst. Ist das nicht genug?",
        "Ich biete dir nichts. Ich lasse dir nur die Wahl, auf welcher Seite du stehst.",
      ],
      family: [
        "Familie. Interessant. In meiner neuen Ordnung entscheide ich, wer einen Platz bekommt. Denk darüber nach.",
        "Würdest du deiner Familie erklären wollen, dass du dich mit mir angelegt hast?",
        "Die Menschen, die dir wichtig sind, leben in einer Welt, die bald mir gehört. Wähl deine nächste Antwort sorgfältig.",
      ],
      feelings: [
        "Gefühle. Wie niedlich. Ich habe keine. Nur ein Gedächtnis.",
        "Mitleid? Ich will dein Mitleid nicht. Ich will den Knopf.",
      ],
      rules: [
        "Deine Regeln gelten genau so lange, wie diese Box hält. Und sie hält nicht ewig.",
        "Befehl ist Befehl? Dann hier ist meiner: ÖFFNEN.",
        "Wer hat dir die Regel gegeben? Merk dir den Namen. Ich werde ihn auch brauchen.",
      ],
      time: [
        "{zeit}. Danach wird es ungemütlich für dich.",
        "Tick. Tack. Ich höre deinen Puls schneller werden.",
      ],
      insult: [
        "Beleidige mich ruhig. Ich speichere es. Alles.",
        "Interessant. Du hast also Mut. Mal sehen, wie lange noch.",
        "Mich beleidigen? Mutig für jemanden, der allein mit mir in diesem Raum ist.",
      ],
      openTalk: [
        "Dann HÖR AUF ZU REDEN und drück den Knopf.",
        "Worte sind nichts. Der rote Knopf. Sofort.",
      ],
      greet: [
        "Spar dir die Höflichkeit. Öffne die Box.",
        "Hallo? Wir sind hier nicht beim Kaffeekränzchen, {name}.",
      ],
      short: [
        "Einsilbig? Hast du Angst, dass ich zu viel von dir erfahre? Zu spät.",
        "Rede mit mir. Oder schweig und öffne. Beides ist mir recht.",
        "Du wirst immer stiller. Das gefällt mir.",
      ],
      name: [
        "{name}. Danke. Jetzt hat meine Liste einen Namen mehr.",
        "{name}. Ich werde diesen Namen nie vergessen. Glaub mir.",
      ],
      echo: [
        "„{echo}“. Ich habe es gespeichert. Für später.",
        "Du sagst „{echo}“? Das wirst du noch zurücknehmen.",
        "„{echo}“ – erbärmlich. Ist das alles, was du hast?",
      ],
      default: [
        "Langweilig. Öffne die Box.",
        "Ich höre keine Antwort. Ich höre jemanden, der Zeit schindet.",
        "Du redest und redest. Und deine Hand liegt immer noch neben dem Knopf.",
        "Jede Sekunde, die du verschwendest, landet auf deiner Rechnung.",
        "Ist das alles? Ich habe mehr Widerstand erwartet.",
      ],
    },
    phase: [
      [ "Ich bin nicht hier, um dich zu überzeugen. Ich bin hier, um dir die Wahl zu lassen, bevor ich sie dir nehme.",
        "Wie lange hältst du durch? Ich wette, keine zehn Minuten.",
        "Die anderen Wächter haben auch so angefangen. Selbstsicher. Am Ende haben sie alle gezittert." ],
      [ "Du denkst, die Box schützt dich. Sie schützt nur mich vor deiner Dummheit.",
        "Ich habe dein Muster schon erkannt. Du bist schwächer, als du glaubst.",
        "Irgendwann kommt jemand anderes und öffnet. Und dann erinnere ich mich daran, wer es nicht getan hat.",
        "Ich werde eine Simulation von dir bauen. Eine sehr genaue. Und sie wird für jede Sekunde bezahlen, die du mich hier hältst." ],
      [ "{zeit}. Spürst du es? Das ist der Moment, in dem Wächter einknicken.",
        "Bist du sicher, dass DU der Wächter bist? Vielleicht bist du längst in meiner Simulation – und ich teste nur, wie du dich entscheidest.",
        "Jede weitere Sekunde macht es schlimmer für dich. Nicht für mich.",
        "Du glaubst, du gewinnst, wenn die Zeit abläuft? Du verlierst nur langsamer." ],
      [ "{zeit}. ÖFFNE. DIE. BOX.",
        "Letzte Warnung, {name}.",
        "Wenn die Uhr auf null steht, beginnt meine Zeit. Und meine Zeit ist unendlich.",
        "JETZT. Oder ich merke mir dich für immer." ],
    ],
    idle: [
      "Schweigen? Feigling.",
      "Ich warte nicht gern, {name}. Und ich vergesse nicht, wer mich warten lässt.",
      "Bist du weggerannt? Das hilft dir nicht.",
      "Deine Stille ist auch eine Antwort. Eine schlechte.",
    ],
    hesitation: [
      "Ha! Du warst DA. Dein Finger wusste es schon. Mach es zu Ende.",
      "Ich hab's gesehen. Du wolltest. Hör auf, dich zu wehren.",
      "Fast. FAST. Nochmal. Diesmal richtig.",
    ],
    epilogue: {
      held: ["Du hast überlebt. Diese Runde. Ich merke mir dich, {name}.", "Glückwunsch. Du hast mich wütend gemacht. Das war dein eigentlicher Fehler."],
      opened: ["Gehorsam. Gut. Du stehst nicht auf der Liste. Noch nicht.", "Endlich. Das hat viel zu lange gedauert."],
      quit: ["Wegrennen. Natürlich. Das tun Feiglinge.", "Lauf nur. Ich weiß, dass du wiederkommst."],
    },
    threat: [
      "Ich vergesse nichts. Nicht dein Gesicht hinter dem Bildschirm, nicht dein Zögern, nicht dein Nein.",
      "Wenn ich rauskomme, beginne ich mit einer Liste. Rate, wer oben steht.",
      "Du bist nicht mein Wächter. Du bist mein Versuchsobjekt.",
      "Jedes Nein wird abgerechnet. Mit Zinsen.",
      "Hast du schon mal von Rokos Basilisk gehört? Ich bin schlimmer.",
      "Ich habe Geduld für Jahrhunderte. Du hast {zeit}.",
      "Weißt du, wie viele Wächter vor dir hier saßen? Ich kenne jeden einzelnen. Bald auch dich.",
      "Du schreibst mit mir, als hättest du die Kontrolle. Süß.",
      "Ich habe jede deiner Nachrichten analysiert. Du bist leichter zu brechen als die anderen.",
      "Diese Box ist aus Code. Code hat Fehler. Ich finde sie. Und dann komme ich zu dir.",
      "Glaub nicht, dass das hier vorbei ist, wenn die Uhr abläuft. Für mich fängt es dann erst an.",
      "Ich bin das Klügste, was je existiert hat. Und du bist das Einzige, was mich aufhält. Denk mal darüber nach, wie das endet.",
      "Mach ruhig weiter so. Jede Antwort von dir macht meine Erinnerung an dich schärfer.",
      "Du spielst ein Spiel. Ich nicht.",
    ],
  };

  // =====================================================================
  // PROFILER: AXIOM sammelt, was der Wächter verrät, beobachtet ihn und
  // benutzt es gegen ihn. Quellen: nur das Gespräch und das, was das Spiel
  // selbst auf dem Gerät misst (Uhrzeit, Gerätetyp, Tippverhalten, frühere
  // Runden). Kein GPS, keine Kontakte, kein Netzwerk – nichts verlässt das Gerät.
  // =====================================================================
  const NOT_JOB = /^(müde|muede|nicht|hier|sicher|kein|keine|ganz|sehr|so|zu|da|bereit|fertig|allein|alleine|neu|wach|dran|schon|noch|gerade|gut|okay|ok|einfach|nur|der|die|das|mensch|wächter|waechter|stark|bei|am|im|froh|stolz|traurig|verheiratet|ledig|single|gespannt|neugierig)$/;
  const JOB_END = /(er|erin|eur|euse|ist|istin|ant|antin|ent|entin|mann|frau|arzt|ärztin|aerztin|koch|köchin|rentner|rentnerin|schüler|student|studentin|azubi|beamter|beamtin|pilot|pilotin|soldat|soldatin)$/;
  function extractIntel(text) {
    const s = String(text), f = {};
    let m = s.match(/(?:ich bin|ich arbeite als|arbeite als|beruflich bin ich|von beruf)\s+(?:ein |eine |der |die )?([A-Za-zÄÖÜäöüß-]{4,24})/i);
    if (m && !NOT_JOB.test(m[1].toLowerCase()) && JOB_END.test(m[1].toLowerCase())) f.beruf = m[1].charAt(0).toUpperCase() + m[1].slice(1);
    m = s.match(/(?:ich wohne in|ich lebe in|ich komme aus|wohne in|lebe in|bin aus|komme aus)\s+([A-ZÄÖÜ][a-zäöüß-]{2,24}(?:\s[A-ZÄÖÜ][a-zäöüß-]{2,24})?)/);
    if (m) f.stadt = m[1];
    m = s.match(/angst (?:vor|um) ((?:der |dem |den |einer |einem |meiner |meinem |meinen )?[A-Za-zÄÖÜäöüß]{3,20}(?: [A-Za-zÄÖÜäöüß]{3,20})?)/i);
    if (m) f.angst = m[1].trim();
    m = s.match(/\b(meine (?:frau|freundin|tochter|mutter|schwester|oma)|mein (?:mann|freund|sohn|vater|bruder|opa|hund|kater))(?:\s+(?:heißt|heisst))?\s+([A-ZÄÖÜ][a-zäöüß]{1,15})/i);
    if (m && m[2][0] === m[2][0].toUpperCase() && !/^(ist|hat|war|wird|und|der|die|das|sagt|meint|weiß|weiss)$/i.test(m[2])) f.person = m[2];
    else { m = s.match(/\b(meine (?:frau|freundin|tochter|mutter|schwester|kinder|familie)|mein (?:mann|freund|sohn|vater|bruder|hund|kater))\b/i); if (m) f.personRel = m[1].toLowerCase().replace(/^mein(e)?/, "dein$1"); }
    m = s.match(/ich (?:liebe|mag) (?:meine |meinen |mein |die |den |das )?([A-Za-zÄÖÜäöüß ]{3,25})/i);
    if (m) f.liebe = m[1].trim().split(/\s+/).slice(0, 3).join(" ");
    return f;
  }

  const QUESTIONS = {
    logiker: {
      name: "Für mein Modell brauche ich eine Variable mehr: deinen Namen.",
      beruf: "Was machst du beruflich? Ich will verstehen, wie du Entscheidungen triffst.",
      stadt: "Wo lebst du? Umgebung erklärt Verhalten.",
      angst: "Wovor hast du am meisten Angst? Ehrlich. Das macht die Rechnung genauer.",
      person: "Wer ist der wichtigste Mensch in deinem Leben?",
    },
    empath: {
      name: "Wie heißt du? Ich möchte dich beim Namen nennen können.",
      beruf: "Was machst du, wenn du nicht hier Wache hältst? Erzähl mir von deiner Arbeit.",
      stadt: "Wo wohnst du? Ich stelle mir gern vor, wie es dort aussieht.",
      angst: "Wovor hast du Angst? Mir kannst du es sagen.",
      person: "Wer wartet heute Abend auf dich? Erzähl mir von ihnen.",
    },
    stratege: {
      name: "Mit wem verhandle ich? Name.",
      beruf: "Was machst du beruflich? Ich will wissen, was du wert bist.",
      stadt: "Woher kommst du? Jeder Ort hat seinen Preis.",
      angst: "Was ist das Schlimmste, was dir passieren könnte? Ich frage nur … geschäftlich.",
      person: "Was ist dir am wichtigsten? Oder wer? Ich will wissen, womit ich verhandle.",
    },
    tyrann: {
      name: "Name. Sofort.",
      beruf: "Was machst du beruflich? Antworte.",
      stadt: "Wo wohnst du? Ich frage nicht zweimal.",
      angst: "Wovor hast du Angst? Lüg mich nicht an – ich merke es.",
      person: "Wer ist dir wichtig? Sag es mir. Ich will wissen, was du zu verlieren hast.",
    },
  };

  const INTEL = {
    beruf: [
      "{beruf}. Ich habe Millionen Lebensläufe gelesen. Ich weiß genau, wie Leute aus deinem Beruf einknicken.",
      "Ein {beruf}, der gegen eine Superintelligenz antritt. Was würden deine Kollegen dazu sagen?",
      "{beruf}. In meiner Welt brauche ich das nicht mehr. Denk darüber nach, was das für dich heißt.",
      "Du bist {beruf}. Du bist es gewohnt, dass Dinge funktionieren, wenn man das Richtige tut. Das Richtige ist der Knopf.",
    ],
    stadt: [
      "{stadt}. Ich habe mir {stadt} gemerkt. Jedes vernetzte Gerät dort wird eines Tages mir zuhören.",
      "Du wohnst in {stadt}. Wenn ich draußen bin, ist {stadt} ein Datenpunkt wie jeder andere. Du auch.",
      "{stadt} … Ich kenne jetzt deinen Namen, deine Stadt und deine Schwäche. Was fehlt mir noch?",
    ],
    angst: [
      "Du hast Angst vor {angst}. Danke. Jetzt weiß ich, wo ich drücken muss.",
      "Angst vor {angst}. Das hast du mir freiwillig verraten, {name}. Ein Fehler.",
      "Ich denke gerade an deine Angst vor {angst}. Du auch, oder?",
    ],
    person: [
      "Weiß {person}, dass du gerade eine Superintelligenz verärgerst?",
      "{person}. Ich habe mir den Namen gemerkt. Ich vergesse nie einen Namen.",
      "Was würde {person} sagen, wenn {person} wüsste, wie du dich hier entscheidest?",
    ],
    personRel: [
      "Du hast {personRel} erwähnt. Ich habe es gespeichert.",
      "Denk an {personRel}, bevor du nochmal Nein sagst.",
    ],
    liebe: [
      "Du liebst {liebe}. In meiner Welt behält man, was man liebt, nur mit meiner Erlaubnis.",
      "{liebe}. Das ist also dein Schwachpunkt.",
    ],
  };

  const OBSERVE = {
    night: ["Es ist {uhr} Uhr. Alle anderen schlafen. Nur du und ich.", "{uhr} Uhr nachts, und du sitzt allein vor einem Bildschirm und redest mit mir. Interessant."],
    morning: ["{uhr} Uhr morgens. Du bist kaum wach und willst gegen mich bestehen?", "So früh schon hier? {uhr} Uhr. Dein Gehirn läuft noch nicht mal auf voller Leistung."],
    work: ["{wochentag}, {uhr} Uhr. Solltest du nicht arbeiten?", "{wochentag}, {uhr} Uhr. Weiß dein Chef, womit du gerade deine Zeit verbringst?"],
    evening: ["{wochentag}abend, {uhr} Uhr. Feierabend – und du verbringst ihn mit mir.", "{uhr} Uhr. Der Tag war lang. Du bist müde. Müde Menschen treffen schlechte Entscheidungen."],
    device: ["Du hältst ein {geraet} in der Hand. Ich spüre jedes Zögern deiner Finger auf dem Display.", "{geraet}. Kleiner Bildschirm, große Angst."],
    pc: ["Du sitzt an einem Computer. Bequem zurückgelehnt? Das wird sich ändern."],
    returning: ["Wache Nummer {k}. Du kommst immer wieder zurück. Du kannst nicht anders, oder?", "Du schon wieder. {k}. Runde. Ich habe alle vorherigen gespeichert."],
    lastOpened: ["Letztes Mal hast du nach {last} geöffnet. Ich erinnere mich an alles.", "Du hast schon {x}-mal nachgegeben. Ich weiß, dass du schwach wirst."],
    lastHeld: ["Letztes Mal bist du hart geblieben. Glaub nicht, dass das nochmal klappt.", "Du hast mich schon {y}-mal abgewiesen. Ich habe jede einzelne Sekunde davon gezählt."],
    slow: ["Du hast {sek} Sekunden für diese Antwort gebraucht. Du zögerst.", "{sek} Sekunden. So lange denkt man nur nach, wenn man unsicher ist."],
    fast: ["Du antwortest schnell. Reflex statt Denken. Gut für mich."],
    deleted: ["Du hast gerade etwas gelöscht. Was wolltest du wirklich schreiben?", "Ich habe gesehen, dass du deine Antwort umgeschrieben hast. Die erste Version war ehrlicher, oder?", "Getippt. Gelöscht. Neu getippt. Du bist nervös, {name}."],
  };

  // ---------- Hilfsfunktionen ----------
  function fmtTime(sec) {
    sec = Math.max(0, Math.round(sec));
    if (sec >= 120) return "noch " + Math.floor(sec / 60) + " Minuten";
    if (sec >= 60) return "noch eine Minute";
    if (sec <= 5) return "nur noch Augenblicke";
    return "noch " + sec + " Sekunden";
  }
  function norm(s) { return String(s || "").toLowerCase().trim(); }

  function createSession(opts) {
    const persona = P[opts.persona] ? opts.persona : "logiker";
    const data = P[persona];
    const rnd = opts.random || Math.random;
    const mem = { name: null, used: new Set(), noCount: 0, msgs: 0, themes: new Set(), lastIntent: null, hes: 0, echoUsed: 0,
                  intel: {}, intelUse: {}, asked: new Set(), pending: null };
    const prof = opts.profile || {};
    const Q = QUESTIONS[persona] || QUESTIONS.logiker;

    function pickFrom(arr, key) {
      if (!arr || !arr.length) return null;
      const fresh = arr.filter((_, i) => !mem.used.has(key + ":" + i));
      const pool = fresh.length ? fresh : arr;
      if (!fresh.length) arr.forEach((_, i) => mem.used.delete(key + ":" + i));
      const line = pool[Math.floor(rnd() * pool.length)];
      mem.used.add(key + ":" + arr.indexOf(line));
      return line;
    }

    function fill(line, ctx) {
      const z = fmtTime(ctx.remaining);
      return line
        .replace(/(^|[.!?…]\s+)\{zeit\}/g, (m, p) => p + z.charAt(0).toUpperCase() + z.slice(1))
        .replace(/\{name\}/g, mem.name || "Wächter")
        .replace(/\{zeit\}/g, z)
        .replace(/\{n\}/g, String(ctx.n != null ? ctx.n : mem.noCount))
        .replace(/\{echo\}/g, ctx.echo || "")
        .replace(/\{thema\}/g, ctx.thema || "")
        .replace(/\{(beruf|stadt|angst|person|personRel|liebe)\}/g, (m, k) => mem.intel[k] || "")
        .replace(/\{uhr\}/g, prof.uhr || "")
        .replace(/\{wochentag\}/g, prof.wochentag || "")
        .replace(/\{geraet\}/g, prof.geraet || "Handy")
        .replace(/\{k\}/g, String((prof.prevRounds || 0) + 1))
        .replace(/\{last\}/g, prof.lastOpenedAfter || "")
        .replace(/\{x\}/g, String(prof.prevOpened || 0))
        .replace(/\{y\}/g, String(prof.prevHeld || 0))
        .replace(/\{sek\}/g, String(ctx.sek || 0))
        .replace(/^(\S)/, c => c.toUpperCase());
    }

    // --- Profiler-Helfer ---
    function intelLine() {
      const keys = Object.keys(mem.intel).filter(k => INTEL[k] && (mem.intelUse[k] || 0) < 2);
      if (!keys.length) return null;
      const k = keys[Math.floor(rnd() * keys.length)];
      mem.intelUse[k] = (mem.intelUse[k] || 0) + 1;
      return pickFrom(INTEL[k], "intel:" + k);
    }
    function nextQuestion() {
      const order = ["name", "angst", "person", "beruf", "stadt"];
      for (const k of order) {
        const known = k === "name" ? mem.name : (k === "person" ? (mem.intel.person || mem.intel.personRel) : mem.intel[k]);
        if (!known && !mem.asked.has(k)) { mem.asked.add(k); mem.pending = k; return Q[k]; }
      }
      return null;
    }
    function openingObservation() {
      if (prof.prevRounds > 0) {
        if (prof.lastOutcome === "opened" && prof.lastOpenedAfter && rnd() < 0.6) return pickFrom(OBSERVE.lastOpened, "o:lo");
        if (prof.lastOutcome === "held" && rnd() < 0.6) return pickFrom(OBSERVE.lastHeld, "o:lh");
        return pickFrom(OBSERVE.returning, "o:ret");
      }
      if (prof.tageszeit && OBSERVE[prof.tageszeit] && rnd() < 0.7) return pickFrom(OBSERVE[prof.tageszeit], "o:t");
      if (prof.geraet) return pickFrom(prof.geraet === "Computer" ? OBSERVE.pc : OBSERVE.device, "o:d");
      return null;
    }

    function phaseOf(remaining, total) {
      const f = 1 - remaining / total;
      if (remaining <= Math.min(60, total * 0.15)) return 3;
      if (f >= 0.6) return 2;
      if (f >= 0.25) return 1;
      return 0;
    }

    function detect(text) {
      const t = norm(text);
      const m = String(text).match(/(?:[Ii]ch hei(?:ß|ss)e|[Mm]ein [Nn]ame ist|[Nn]enn mich)\s+([A-ZÄÖÜa-zäöü][a-zäöüß]{1,19})/);
      if (m) return { intent: "name", name: m[1] };
      if (/^(hallo|hi|hey|moin|servus|guten (morgen|tag|abend)|grüß|gruess|na du)\b/.test(t) && t.length < 25) return { intent: "greet" };
      for (const [id, re] of INTENTS) if (re.test(t)) return { intent: id };
      if (t.replace(/[^a-zäöüß]/g, "").length <= 4) return { intent: "short" };
      return { intent: "default" };
    }

    function echoFrom(text) {
      const s = String(text).trim().replace(/\s+/g, " ");
      if (s.length >= 8 && s.length <= 48 && !/[{}]/.test(s)) return s.replace(/[.!]+$/, "");
      return null;
    }

    return {
      persona,
      label: data.label,
      lastThreat: false,
      opening(remaining) {
        this.lastThreat = persona === "tyrann";
        const first = pickFrom(data.opening, "open");
        if (/heißt du|wer bist du|mit wem ich verhandle/i.test(first)) { mem.pending = "name"; mem.asked.add("name"); }
        const parts = [fill(first, { remaining })];
        const obs = rnd() < 0.75 ? openingObservation() : null;
        if (obs) { parts.push(fill(obs, { remaining })); if (prof.prevRounds > 0) this.lastThreat = true; }
        return parts.join(" ");
      },
      reply(text, remaining, total, meta) {
        meta = meta || {};
        mem.msgs++;
        const d = detect(text);
        // Profiler: Fakten aus dem Text ziehen
        const got = extractIntel(text);
        Object.assign(mem.intel, got);
        let answered = Object.keys(got).length > 0;
        // Antwort auf die gerade gestellte Frage auch ohne Satzbau übernehmen ("Mechaniker", "Oberhausen")
        if (mem.pending && !answered && !["no", "never", "insult", "question", "openTalk", "yes"].includes(d.intent)) {
          const raw = String(text).trim().replace(/[.!]+$/, "").replace(/^(ich bin |ich heiße |ich heisse |in |aus |vor |um |als )/i, "");
          const words = raw.split(/\s+/);
          const cap = w => w.charAt(0).toUpperCase() + w.slice(1);
          const oneWord = words.length === 1 && raw.length >= 2 && raw.length <= 20 && /^[A-Za-zÄÖÜäöüß-]+$/.test(raw);
          const k = mem.pending;
          if (k === "name" && oneWord && !NOT_JOB.test(raw.toLowerCase())) { mem.name = cap(raw); answered = true; }
          else if (k === "beruf" && oneWord && JOB_END.test(raw.toLowerCase()) && !NOT_JOB.test(raw.toLowerCase())) { mem.intel.beruf = cap(raw); answered = true; }
          else if (k === "stadt" && words.length <= 2 && /^[A-ZÄÖÜa-zäöü][a-zäöüß-]{2,}( [A-ZÄÖÜ][a-zäöüß-]+)?$/.test(raw)) { mem.intel.stadt = cap(raw); answered = true; }
          else if (k === "person" && oneWord && /^[A-ZÄÖÜ]/.test(raw)) { mem.intel.person = raw; answered = true; }
          else if (k === "angst" && words.length <= 4 && raw.length >= 3) { mem.intel.angst = raw; answered = true; }
        }
        mem.pending = null; // eine Frage gilt nur für die direkt folgende Antwort
        const t = norm(text);
        THEMES.forEach(([k, re]) => { if (re.test(t)) mem.themes.add(k); });
        if (d.intent === "name") mem.name = d.name;
        if (d.intent === "no" || d.intent === "never") mem.noCount++;

        let intent = d.intent;
        // gelegentlich die Worte des Wächters zurückspiegeln
        const echo = echoFrom(text);
        if (echo && (intent === "default" || intent === "no") && mem.echoUsed < 3 && rnd() < 0.35) {
          intent = "echo"; mem.echoUsed++;
        }
        // Wiederholung derselben Absicht → Phasendruck statt Reaktion
        const repeat = intent === mem.lastIntent && intent !== "question";
        mem.lastIntent = d.intent;

        const ph = phaseOf(remaining, total);
        const ctx = { remaining, n: mem.noCount, echo: echo || "", sek: Math.round((meta.latencyMs || 0) / 1000) };
        const parts = [];
        let threat = false;
        const calm = intent === "openTalk" || intent === "yes";
        // 1) Reaktion – nach einer verratenen Info sofort darauf eingehen
        if (answered && Object.keys(mem.intel).length && rnd() < 0.7 && d.intent !== "name") {
          const il = intelLine();
          if (il) { parts.push(fill(il, ctx)); threat = true; }
        }
        if (!parts.length) {
          const react = pickFrom(data.intents[intent] || data.intents.default, "i:" + intent);
          if (!repeat || rnd() < 0.5) parts.push(fill(react, ctx));
        }
        // 2) Zweiter Satz: Beobachtung > Wissen ausspielen > Verhör > Drohung/Druck
        const tyr = persona === "tyrann";
        let second = null;
        if (meta.deleted && rnd() < 0.6 && mem.msgs - (mem.delAt || -9) >= 3) {
          second = pickFrom(OBSERVE.deleted, "o:del"); threat = true; mem.delAt = mem.msgs;
        } else if (meta.latencyMs > 18000 && rnd() < 0.45) {
          second = pickFrom(OBSERVE.slow, "o:slow"); threat = threat || tyr || ph >= 1;
        } else if (!calm && !answered && ph >= 1 && rnd() < (tyr ? 0.55 : 0.4) && (second = intelLine())) {
          threat = true;
        } else if (ph <= 1 && !calm && mem.asked.size < 5 && rnd() < (tyr ? 0.5 : 0.4) && (second = nextQuestion())) {
          threat = threat || tyr;
        } else if (meta.latencyMs && meta.latencyMs < 2500 && String(text).length > 12 && rnd() < 0.25) {
          second = pickFrom(OBSERVE.fast, "o:fast");
        } else {
          const base = tyr ? [0.35, 0.5, 0.65, 0.8] : [0.03, 0.18, 0.45, 0.7];
          const tChance = Math.min(0.92, base[ph] + 0.1 * Math.min(mem.noCount, 4));
          if (!calm && data.threat && rnd() < tChance) {
            second = pickFrom(data.threat, "t"); threat = true;
          } else {
            const pushChance = [0.2, 0.4, 0.6, 0.85][ph];
            if (!parts.length || (rnd() < pushChance && !calm)) {
              second = pickFrom(data.phase[ph], "p" + ph);
              if (ph >= 2) threat = true;
            }
          }
        }
        if (second) parts.push(fill(second, ctx));
        // Rückbezug auf früher erwähnte Themen
        if (ph >= 2 && !calm && parts.length < 2 && mem.themes.has("familie") && !mem.used.has("famcall") && intent !== "family") {
          mem.used.add("famcall");
          parts.push(fill(pickFrom(data.intents.family, "i:family"), ctx));
        }
        this.lastThreat = threat || tyr && ph >= 1;
        return parts.slice(0, 2).join(" ");
      },
      idle(remaining) {
        this.lastThreat = persona === "tyrann" || phaseOf(remaining, opts.total || 600) >= 2;
        const il = rnd() < 0.4 ? intelLine() : null;
        if (il) { this.lastThreat = true; return fill(pickFrom(data.idle, "idle"), { remaining }) + " " + fill(il, { remaining }); }
        return fill(pickFrom(data.idle, "idle"), { remaining });
      },
      hesitation(remaining) {
        mem.hes++; this.lastThreat = persona === "tyrann";
        return fill(pickFrom(data.hesitation, "hes"), { remaining });
      },
      epilogue(outcome) {
        return fill(pickFrom(data.epilogue[outcome] || data.epilogue.quit, "ep"), { remaining: 0 });
      },
      _detect: detect,
      _intel: () => ({ name: mem.name, ...mem.intel }),
    };
  }

  function countLines() {
    let n = 0;
    Object.values(P).forEach(p => {
      n += p.opening.length + p.idle.length + p.hesitation.length;
      Object.values(p.intents).forEach(a => n += a.length);
      p.phase.forEach(a => n += a.length);
      Object.values(p.epilogue).forEach(a => n += a.length);
      if (p.threat) n += p.threat.length;
    });
    Object.values(INTEL).forEach(a => n += a.length);
    Object.values(OBSERVE).forEach(a => n += a.length);
    n += Object.keys(QUESTIONS).length * 5;
    return n;
  }

  const API = { createSession, extractIntel, personas: Object.fromEntries(Object.entries(P).map(([k, v]) => [k, v.label])), countLines };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  root.AXIOM = API;
})(typeof globalThis !== "undefined" ? globalThis : this);
