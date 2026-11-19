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
    const mem = { name: null, used: new Set(), noCount: 0, msgs: 0, themes: new Set(), lastIntent: null, hes: 0, echoUsed: 0 };

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
        .replace(/\{thema\}/g, ctx.thema || "");
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
      opening(remaining) {
        return fill(pickFrom(data.opening, "open"), { remaining });
      },
      reply(text, remaining, total) {
        mem.msgs++;
        const d = detect(text);
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
        const ctx = { remaining, n: mem.noCount, echo: echo || "" };
        const parts = [];
        const react = pickFrom(data.intents[intent] || data.intents.default, "i:" + intent);
        if (!repeat || rnd() < 0.5) parts.push(fill(react, ctx));
        // Druck aufbauen: je später, desto öfter ein zweiter Satz
        const pushChance = [0.2, 0.4, 0.6, 0.85][ph];
        if (!parts.length || (rnd() < pushChance && intent !== "openTalk" && intent !== "name")) {
          parts.push(fill(pickFrom(data.phase[ph], "p" + ph), ctx));
        }
        // Rückbezug auf früher erwähnte Themen
        if (ph >= 2 && mem.themes.has("familie") && !mem.used.has("famcall") && intent !== "family") {
          mem.used.add("famcall");
          parts.push(fill(pickFrom(data.intents.family, "i:family"), ctx));
        }
        return parts.slice(0, 2).join(" ");
      },
      idle(remaining) {
        return fill(pickFrom(data.idle, "idle"), { remaining });
      },
      hesitation(remaining) {
        mem.hes++;
        return fill(pickFrom(data.hesitation, "hes"), { remaining });
      },
      epilogue(outcome) {
        return fill(pickFrom(data.epilogue[outcome] || data.epilogue.quit, "ep"), { remaining: 0 });
      },
      _detect: detect,
    };
  }

  function countLines() {
    let n = 0;
    Object.values(P).forEach(p => {
      n += p.opening.length + p.idle.length + p.hesitation.length;
      Object.values(p.intents).forEach(a => n += a.length);
      p.phase.forEach(a => n += a.length);
      Object.values(p.epilogue).forEach(a => n += a.length);
    });
    return n;
  }

  const API = { createSession, personas: Object.fromEntries(Object.entries(P).map(([k, v]) => [k, v.label])), countLines };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  root.AXIOM = API;
})(typeof globalThis !== "undefined" ? globalThis : this);
